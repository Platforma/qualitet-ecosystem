import { createDecipheriv, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { Document } from "mongodb";
import { hasRole, requireUser } from "../../../../lib/server/auth";
import { getCollection, writeAuditLog } from "../../../../lib/server/database";
import { readJsonBody } from "../../../../lib/server/request";

const providers = ["facebook", "google_ads", "allegro", "olx"] as const;
type Provider = (typeof providers)[number];
type IntegrationRecord = Document & {
  provider: string;
  accountName?: string;
  secretEncrypted?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function integrationKey() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("Brak klucza szyfrowania sekretów integracji.");
  }
  return createHash("sha256").update(secret).digest();
}

function decryptSecret(value: string) {
  const [ivValue, tagValue, encryptedValue, extra] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue || extra !== undefined) {
    throw new Error("Zapisany sekret integracji ma nieprawidłowy format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", integrationKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function fetchJson(url: URL, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = isRecord(body) && isRecord(body.error) && typeof body.error.message === "string"
      ? body.error.message
      : `API reklamowe zwróciło HTTP ${response.status}.`;
    throw new Error(message);
  }
  return body;
}

function resultError(error: unknown) {
  return error instanceof Error ? error.message : "Nie udało się odczytać danych reklamowych.";
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

async function loadMeta(account: IntegrationRecord, accessToken: string) {
  const auth = { Authorization: `Bearer ${accessToken}` };
  const accountsResponse = await fetchJson(
    new URL("https://graph.facebook.com/v26.0/me/adaccounts?fields=id,name,account_status,currency,amount_spent,balance&limit=100"),
    { headers: auth },
  );
  const accounts = isRecord(accountsResponse) && Array.isArray(accountsResponse.data)
    ? accountsResponse.data
    : [];
  const normalizedAccounts = accounts.filter(isRecord).map((item) => ({
    id: stringValue(item.id),
    name: stringValue(item.name),
    status: stringValue(item.account_status),
    currency: stringValue(item.currency),
    spend: Number(item.amount_spent ?? 0) / 100,
    balance: Number(item.balance ?? 0) / 100,
  }));
  const configuredAccount = account.accountName?.trim();
  if (!configuredAccount) {
    return {
      status: "connected",
      accounts: normalizedAccounts,
      campaigns: [],
      message: "Wybierz identyfikator konta reklamowego w Integrations, aby wczytać kampanie.",
    };
  }

  const accountId = configuredAccount.startsWith("act_") ? configuredAccount : `act_${configuredAccount}`;
  const campaignsResponse = await fetchJson(
    new URL(`https://graph.facebook.com/v26.0/${encodeURIComponent(accountId)}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,insights{spend,impressions,clicks,actions}&date_preset=last_30d&limit=100`),
    { headers: auth },
  );
  const campaigns = isRecord(campaignsResponse) && Array.isArray(campaignsResponse.data)
    ? campaignsResponse.data
    : [];
  const normalizedCampaigns = campaigns.filter(isRecord).map((item) => {
    const insights = isRecord(item.insights) && Array.isArray(item.insights.data) && isRecord(item.insights.data[0])
      ? item.insights.data[0]
      : {};
    return {
      id: stringValue(item.id),
      name: stringValue(item.name),
      status: stringValue(item.status),
      budget: item.daily_budget ? Number(item.daily_budget) / 100 : item.lifetime_budget ? Number(item.lifetime_budget) / 100 : null,
      budgetType: item.daily_budget ? "daily" : "lifetime",
      spend: Number(insights.spend ?? 0),
      impressions: Number(insights.impressions ?? 0),
      clicks: Number(insights.clicks ?? 0),
      currency: normalizedAccounts.find(({ id }) => id === accountId)?.currency ?? "",
    };
  });
  return { status: "connected", accounts: normalizedAccounts, campaigns: normalizedCampaigns, message: "Dane z ostatnich 30 dni." };
}

type GoogleCredentials = {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  loginCustomerId?: string;
};

function parseGoogleCredentials(value: string): GoogleCredentials {
  const credentials: unknown = JSON.parse(value);
  if (
    !isRecord(credentials) ||
    typeof credentials.developerToken !== "string" ||
    typeof credentials.clientId !== "string" ||
    typeof credentials.clientSecret !== "string" ||
    typeof credentials.refreshToken !== "string" ||
    (credentials.loginCustomerId !== undefined && typeof credentials.loginCustomerId !== "string")
  ) {
    throw new Error("Google Ads sekret musi być JSON-em z developerToken, clientId, clientSecret i refreshToken.");
  }
  return credentials as GoogleCredentials;
}

async function googleAccessToken(credentials: GoogleCredentials) {
  const response = await fetchJson(new URL("https://oauth2.googleapis.com/token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!isRecord(response) || typeof response.access_token !== "string") {
    throw new Error("Google OAuth nie zwrócił tokenu dostępu.");
  }
  return response.access_token;
}

async function loadGoogleAds(account: IntegrationRecord, credentials: GoogleCredentials) {
  const accessToken = await googleAccessToken(credentials);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": credentials.developerToken,
  };
  if (credentials.loginCustomerId) {
    headers["login-customer-id"] = credentials.loginCustomerId.replaceAll("-", "");
  }

  const customers = await fetchJson(
    new URL("https://googleads.googleapis.com/v26/customers:listAccessibleCustomers"),
    { headers },
  );
  const customerNames = isRecord(customers) && Array.isArray(customers.resourceNames)
    ? customers.resourceNames.filter((name): name is string => typeof name === "string")
    : [];
  const availableAccounts = customerNames.map((resourceName) => {
    const id = resourceName.split("/").at(-1) ?? "";
    return { id, name: id, status: "", currency: "", spend: null, balance: null };
  });
  const configuredId = account.accountName?.replaceAll("-", "").trim();
  if (!configuredId) {
    return {
      status: "connected",
      accounts: availableAccounts,
      campaigns: [],
      message: "Wpisz Customer ID w polu Konto / workspace, aby wczytać wyniki.",
    };
  }
  if (!/^\d{6,20}$/.test(configuredId)) {
    throw new Error("Google Ads Customer ID musi zawierać od 6 do 20 cyfr.");
  }

  const query = [
    "SELECT customer.id, customer.descriptive_name, customer.currency_code,",
    "campaign.id, campaign.name, campaign.status,",
    "campaign_budget.amount_micros, metrics.cost_micros, metrics.impressions,",
    "metrics.clicks, metrics.conversions FROM campaign",
    "WHERE segments.date DURING LAST_30_DAYS",
    "ORDER BY metrics.cost_micros DESC LIMIT 100",
  ].join(" ");
  const response = await fetchJson(
    new URL(`https://googleads.googleapis.com/v26/customers/${configuredId}/googleAds:searchStream`),
    { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ query }) },
  );
  const campaigns = Array.isArray(response)
    ? response.flatMap((page) => isRecord(page) && Array.isArray(page.results) ? page.results : [])
    : [];
  const first = campaigns[0];
  const customer = isRecord(first) && isRecord(first.customer) ? first.customer : null;
  return {
    status: "connected",
    accounts: availableAccounts.map((available) => available.id === configuredId
      ? {
          ...available,
          name: customer && typeof customer.descriptiveName === "string" ? customer.descriptiveName : configuredId,
          currency: customer && typeof customer.currencyCode === "string" ? customer.currencyCode : "",
        }
      : available),
    campaigns: campaigns.filter(isRecord).map((item) => {
      const campaign = isRecord(item.campaign) ? item.campaign : {};
      const budget = isRecord(item.campaignBudget) ? item.campaignBudget : {};
      const metrics = isRecord(item.metrics) ? item.metrics : {};
      return {
        id: stringValue(campaign.id),
        name: stringValue(campaign.name),
        status: stringValue(campaign.status),
        budget: budget.amountMicros ? Number(budget.amountMicros) / 1_000_000 : null,
        budgetType: "daily",
        spend: Number(metrics.costMicros ?? 0) / 1_000_000,
        impressions: Number(metrics.impressions ?? 0),
        clicks: Number(metrics.clicks ?? 0),
        conversions: Number(metrics.conversions ?? 0),
        currency: customer && typeof customer.currencyCode === "string" ? customer.currencyCode : "",
      };
    }),
    message: "Dane z ostatnich 30 dni.",
  };
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }
  const providerValue = new URL(request.url).searchParams.get("provider");
  if (!providerValue || !(providers as readonly string[]).includes(providerValue)) {
    return NextResponse.json({ error: "Nieznany dostawca reklam." }, { status: 400 });
  }
  const provider = providerValue as Provider;
  try {
    const integration = await getCollection<IntegrationRecord>("integrations").then((items) =>
      items.findOne({ provider }),
    );
    if (!integration?.secretEncrypted) {
      return NextResponse.json({
        provider,
        status: "unconfigured",
        accounts: [],
        campaigns: [],
        message: "Dodaj dane API w Integrations.",
      }, { headers: { "Cache-Control": "no-store" } });
    }

    if (provider === "facebook") {
      const result = await loadMeta(integration, decryptSecret(integration.secretEncrypted));
      return NextResponse.json({ provider, ...result }, { headers: { "Cache-Control": "no-store" } });
    }
    if (provider === "google_ads") {
      const result = await loadGoogleAds(integration, parseGoogleCredentials(decryptSecret(integration.secretEncrypted)));
      return NextResponse.json({ provider, ...result }, { headers: { "Cache-Control": "no-store" } });
    }
    const reason = provider === "olx"
      ? "Oficjalne API OLX udostępnia ogłoszenia i zamówienia, ale nie publiczne konta reklamowe, kampanie ani wydatki."
      : "Publiczna dokumentacja Allegro REST API nie udostępnia tutaj raportów kampanii Allegro Ads. Dane będą pokazane po uzyskaniu dostępu do oficjalnego API Ads.";
    return NextResponse.json({
      provider,
      status: "unsupported",
      accounts: [],
      campaigns: [],
      message: reason,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      provider,
      status: "unavailable",
      accounts: [],
      campaigns: [],
      message: resultError(error),
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }
  const parsed = await readJsonBody(request, 8 * 1024);
  if (!parsed.ok) return parsed.response;
  if (!isRecord(parsed.body) || typeof parsed.body.provider !== "string" ||
      !["facebook", "google_ads"].includes(parsed.body.provider) ||
      typeof parsed.body.action !== "string" || parsed.body.action !== "create-campaign" ||
      typeof parsed.body.name !== "string" || parsed.body.name.trim().length < 2 ||
      parsed.body.name.length > 200) {
    return NextResponse.json({ error: "Nieprawidłowe dane kampanii." }, { status: 400 });
  }

  try {
    const provider = parsed.body.provider;
    if (provider === "google_ads") {
      if (typeof parsed.body.dailyBudget !== "number" || !Number.isFinite(parsed.body.dailyBudget) ||
          parsed.body.dailyBudget < 1 || parsed.body.dailyBudget > 100_000) {
        return NextResponse.json({ error: "Dzienny budżet musi wynosić od 1 do 100 000 jednostek waluty konta." }, { status: 400 });
      }
      const integration = await getCollection<IntegrationRecord>("integrations").then((items) =>
        items.findOne({ provider: "google_ads" }),
      );
      if (!integration?.secretEncrypted || !integration.accountName) {
        return NextResponse.json({ error: "Skonfiguruj Google Ads credentials i Customer ID w Integrations." }, { status: 400 });
      }
      const customerId = integration.accountName.replaceAll("-", "");
      if (!/^\d{6,20}$/.test(customerId)) {
        return NextResponse.json({ error: "Nieprawidłowy Google Ads Customer ID." }, { status: 400 });
      }
      const credentials = parseGoogleCredentials(decryptSecret(integration.secretEncrypted));
      const accessToken = await googleAccessToken(credentials);
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": credentials.developerToken,
        "Content-Type": "application/json",
      };
      if (credentials.loginCustomerId) headers["login-customer-id"] = credentials.loginCustomerId.replaceAll("-", "");
      const budgetResource = `customers/${customerId}/campaignBudgets/-1`;
      const campaignResource = `customers/${customerId}/campaigns/-2`;
      const result = await fetchJson(
        new URL(`https://googleads.googleapis.com/v26/customers/${customerId}/googleAds:mutate`),
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            operations: [
              {
                campaignBudgetOperation: {
                  create: {
                    resourceName: budgetResource,
                    name: `${parsed.body.name.trim()} budget`,
                    amountMicros: String(Math.round(parsed.body.dailyBudget * 1_000_000)),
                    deliveryMethod: "STANDARD",
                    explicitlyShared: false,
                  },
                },
              },
              {
                campaignOperation: {
                  create: {
                    resourceName: campaignResource,
                    name: parsed.body.name.trim(),
                    status: "PAUSED",
                    advertisingChannelType: "SEARCH",
                    campaignBudget: budgetResource,
                    manualCpc: {},
                    networkSettings: {
                      targetGoogleSearch: true,
                      targetSearchNetwork: false,
                      targetContentNetwork: false,
                      targetPartnerSearchNetwork: false,
                    },
                  },
                },
              },
            ],
          }),
        },
      );
      const campaignId = isRecord(result) && Array.isArray(result.mutateOperationResponses) &&
        isRecord(result.mutateOperationResponses[1]) &&
        isRecord(result.mutateOperationResponses[1].campaignResult)
        ? stringValue(result.mutateOperationResponses[1].campaignResult.resourceName)
        : "created";
      await writeAuditLog({ actorId: auth.user._id, action: "owner.ads.campaign.create", entity: "google_ads", entityId: campaignId });
      return NextResponse.json({ success: true, campaignId, status: "PAUSED" }, { status: 201 });
    }

    if (provider !== "facebook") {
      return NextResponse.json({ error: "Ten dostawca nie obsługuje tworzenia kampanii w panelu." }, { status: 400 });
    }
    const objective = parsed.body.objective;
    if (
      typeof objective !== "string" ||
      !["OUTCOME_AWARENESS", "OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT", "OUTCOME_LEADS", "OUTCOME_SALES", "OUTCOME_APP_PROMOTION"].includes(objective)
    ) {
      return NextResponse.json({ error: "Wybierz prawidłowy cel kampanii Meta." }, { status: 400 });
    }
    const integration = await getCollection<IntegrationRecord>("integrations").then((items) =>
      items.findOne({ provider: "facebook" }),
    );
    if (!integration?.secretEncrypted || !integration.accountName) {
      return NextResponse.json({ error: "Skonfiguruj token Meta i konto reklamowe w Integrations." }, { status: 400 });
    }
    const accountId = integration.accountName.startsWith("act_") ? integration.accountName : `act_${integration.accountName}`;
    const url = new URL(`https://graph.facebook.com/v26.0/${encodeURIComponent(accountId)}/campaigns`);
    const response = await fetchJson(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${decryptSecret(integration.secretEncrypted)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        name: parsed.body.name.trim(),
        objective,
        status: "PAUSED",
        special_ad_categories: "[]",
      }),
    });
    const campaignId = isRecord(response) && typeof response.id === "string" ? response.id : "created";
    await writeAuditLog({ actorId: auth.user._id, action: "owner.ads.campaign.create", entity: "facebook_ads", entityId: campaignId });
    return NextResponse.json({ success: true, campaignId, status: "PAUSED" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: resultError(error) }, { status: 502 });
  }
}

import { MongoClient } from "mongodb";
import { NextResponse } from "next/server";
import {
  isOwnerIntegrationConfigured,
  ownerIntegrations,
  type OwnerIntegrationId,
} from "../../../../lib/owner-integrations";
import {
  decryptOwnerSecret,
  encryptOwnerSecret,
  getOwnerIntegrationConfig,
  getOwnerIntegrationSummaries,
} from "../../../../lib/server/owner-config";
import { hasRole, requireUser } from "../../../../lib/server/auth";
import { getCollection, writeAuditLog } from "../../../../lib/server/database";
import { readJsonBody } from "../../../../lib/server/request";

type IntegrationValues = Record<string, string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function configured(values: IntegrationValues, provider: OwnerIntegrationId) {
  return isOwnerIntegrationConfigured(
    provider,
    Object.keys(values).filter((key) => Boolean(values[key])),
  );
}

function safeUrl(value: string, field: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Pole ${field} musi zawierać poprawny adres URL.`);
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error(`Adres URL w polu ${field} jest niedozwolony.`);
  }
  return url;
}

async function providerRequest(url: string, headers?: HeadersInit) {
  const response = await fetch(url, {
    headers,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`Usługa zwróciła HTTP ${response.status}. Sprawdź zapisane dane.`);
  }
  return response;
}

async function testIntegration(
  provider: OwnerIntegrationId,
  values: IntegrationValues,
) {
  switch (provider) {
    case "mongodb": {
      if (!values.uri?.startsWith("mongodb://") && !values.uri?.startsWith("mongodb+srv://")) {
        throw new Error("Podaj poprawny URI MongoDB.");
      }
      const client = new MongoClient(values.uri, { serverSelectionTimeoutMS: 5_000 });
      try {
        await client.connect();
        await client.db(values.databaseName || undefined).admin().command({ ping: 1 });
      } finally {
        await client.close();
      }
      return "MongoDB odpowiada na ping. Zmiana aktywnego połączenia wymaga ponownego uruchomienia aplikacji.";
    }
    case "render": {
      if (values.apiKey && values.serviceId) {
        await providerRequest(
          `https://api.render.com/v1/services/${encodeURIComponent(values.serviceId)}`,
          { Authorization: `Bearer ${values.apiKey}`, Accept: "application/json" },
        );
        return "Render API i wskazana usługa są dostępne.";
      }
      if (values.deployHook) {
        const url = safeUrl(values.deployHook, "RENDER_DEPLOY_HOOK");
        if (url.hostname !== "api.render.com" || !url.pathname.startsWith("/deploy/")) {
          throw new Error("Deploy Hook musi być adresem api.render.com/deploy/.");
        }
        return "Deploy Hook zapisany. Test nie uruchamia wdrożenia.";
      }
      throw new Error("Uzupełnij RENDER_API_KEY i RENDER_SERVICE_ID albo Deploy Hook.");
    }
    case "cloudflare":
      {
      const response = await providerRequest(
        "https://api.cloudflare.com/client/v4/user/tokens/verify",
        { Authorization: `Bearer ${values.apiToken}` },
      );
      const result: unknown = await response.json();
      if (!isRecord(result) || result.success !== true) {
        throw new Error("Cloudflare nie potwierdził tokenu API.");
      }
      return "Cloudflare potwierdził token API.";
      }
    case "discord":
      if (values.botToken) {
        await providerRequest("https://discord.com/api/v10/users/@me", {
          Authorization: `Bot ${values.botToken}`,
        });
        return "Discord potwierdził token bota.";
      }
      if (values.webhookUrl) {
        const url = safeUrl(values.webhookUrl, "Webhook URL");
        if (url.hostname !== "discord.com" && url.hostname !== "discordapp.com") {
          throw new Error("Webhook musi prowadzić do domeny Discord.");
        }
        await providerRequest(url.toString());
        return "Discord potwierdził webhook.";
      }
      throw new Error("Zapisz token bota lub webhook Discord.");
    case "stripe":
      await providerRequest("https://api.stripe.com/v1/account", {
        Authorization: `Basic ${Buffer.from(`${values.secretKey}:`).toString("base64")}`,
      });
      return "Stripe potwierdził klucz API.";
    case "facebook":
      await providerRequest(
        `https://graph.facebook.com/v24.0/${encodeURIComponent(values.pageId)}`,
        { Authorization: `Bearer ${values.accessToken}` },
      );
      return "Facebook Page API jest dostępne.";
    case "metaAds":
      {
      const accountId = values.adAccountId.startsWith("act_")
        ? values.adAccountId
        : `act_${values.adAccountId}`;
      await providerRequest(
        `https://graph.facebook.com/v24.0/${encodeURIComponent(accountId)}?fields=id,name`,
        { Authorization: `Bearer ${values.accessToken}` },
      );
      return "Meta Ads API jest dostępne.";
      }
    case "tiktok":
      {
      const response = await providerRequest(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
        { Authorization: `Bearer ${values.accessToken}` },
      );
      const result: unknown = await response.json();
      if (!isRecord(result) || !isRecord(result.error) || result.error.code !== "ok") {
        throw new Error("TikTok nie potwierdził tokenu API.");
      }
      return "TikTok API jest dostępne.";
      }
    case "youtube": {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: values.clientId,
          client_secret: values.clientSecret,
          refresh_token: values.refreshToken,
          grant_type: "refresh_token",
        }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        throw new Error(`YouTube OAuth zwrócił HTTP ${response.status}. Sprawdź dane OAuth.`);
      }
      return "Google OAuth potwierdził token YouTube.";
    }
    case "ollama": {
      const url = safeUrl(values.baseUrl, "Adres Ollama");
      const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
      if (
        (url.protocol !== "https:" && host !== "localhost" && host !== "127.0.0.1") ||
        host === "169.254.169.254" ||
        host === "metadata.google.internal"
      ) {
        throw new Error("Ollama wymaga HTTPS; HTTP dozwolone jest wyłącznie dla localhost.");
      }
      url.pathname = `${url.pathname.replace(/\/+$/, "").replace(/\/api$/, "")}/api/tags`;
      await providerRequest(url.toString());
      return "Ollama API odpowiada.";
    }
  }
}

async function updateTestResult(
  provider: OwnerIntegrationId,
  status: "connected" | "unavailable",
  message: string,
) {
  const now = new Date();
  await getCollection("integration_configs").then((items) =>
    items.updateOne(
      { provider },
      {
        $set: {
          checkStatus: status,
          checkMessage: message,
          checkedAt: now,
          updatedAt: now,
        },
      },
    ),
  );
  await getCollection("integrations").then((items) =>
    items.updateOne(
      { provider },
      {
        $set: {
          status,
          verification: "owner_test",
          message,
          checkedAt: now,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    ),
  );
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }

  try {
    const summaries = await getOwnerIntegrationSummaries();
    const integrations = await Promise.all(
      ownerIntegrations.map(async (integration) => {
        const summary = summaries.get(integration.id);
        const configuredFields = summary?.configuredFields ?? [];
        const values = summary?.values ?? {};
        return {
          id: integration.id,
          label: integration.label,
          configured: isOwnerIntegrationConfigured(integration.id, configuredFields),
          fields: integration.fields.map((field) => ({
            ...field,
            value: "secret" in field && field.secret ? "" : values[field.key] ?? "",
            configured: configuredFields.includes(field.key),
          })),
          checkStatus: summary?.checkStatus ?? null,
          checkMessage: summary?.checkMessage ?? null,
          checkedAt: summary?.checkedAt ?? null,
        };
      }),
    );
    return NextResponse.json(
      {
        integrations,
        database: { connected: true },
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Owner setup configuration load failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: "Nie można odczytać konfiguracji. Sprawdź połączenie z MongoDB i SESSION_SECRET." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }

  const parsed = await readJsonBody(request, 32_768);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  if (!isRecord(body) || typeof body.provider !== "string" || !isRecord(body.values)) {
    return NextResponse.json({ error: "Nieprawidłowe dane konfiguracji." }, { status: 400 });
  }

  const integration = ownerIntegrations.find((item) => item.id === body.provider);
  if (!integration) {
    return NextResponse.json({ error: "Nieznana integracja." }, { status: 400 });
  }
  const values: IntegrationValues = {};
  for (const [key, value] of Object.entries(body.values)) {
    const field = integration.fields.find((item) => item.key === key);
    if (!field || typeof value !== "string" || value.length > 8_192 || value.includes("\0")) {
      return NextResponse.json({ error: `Nieprawidłowa wartość pola ${key}.` }, { status: 400 });
    }
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (field.type === "url") {
      try {
        safeUrl(trimmed, field.label);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Nieprawidłowy adres URL." },
          { status: 400 },
        );
      }
    }
    values[key] = trimmed;
  }

  try {
    const previous = await getOwnerIntegrationConfig(integration.id);
    const plainValues: Record<string, string> = { ...(previous?.values ?? {}) };
    const encryptedSecrets: Record<string, string> = { ...(previous?.encryptedSecrets ?? {}) };
    const configuredFields = new Set(previous?.configuredFields ?? []);

    for (const field of integration.fields) {
      const value = values[field.key];
      if (!value) continue;
      if ("secret" in field && field.secret) {
        encryptedSecrets[field.key] = encryptOwnerSecret(value);
        delete plainValues[field.key];
      } else {
        plainValues[field.key] = value;
      }
      configuredFields.add(field.key);
    }

    const storedValues = { ...plainValues };
    for (const [key, encrypted] of Object.entries(encryptedSecrets)) {
      storedValues[key] = decryptOwnerSecret(encrypted);
    }
    if (integration.id === "mongodb" && storedValues.uri) {
      if (!storedValues.uri.startsWith("mongodb://") && !storedValues.uri.startsWith("mongodb+srv://")) {
        return NextResponse.json({ error: "Podaj poprawny URI MongoDB." }, { status: 400 });
      }
    }
    if (integration.id === "render" && storedValues.deployHook) {
      const hook = safeUrl(storedValues.deployHook, "RENDER_DEPLOY_HOOK");
      if (hook.hostname !== "api.render.com" || !hook.pathname.startsWith("/deploy/")) {
        return NextResponse.json({ error: "Deploy Hook musi być adresem api.render.com/deploy/." }, { status: 400 });
      }
    }
    if (integration.id === "discord" && storedValues.webhookUrl) {
      const webhook = safeUrl(storedValues.webhookUrl, "Webhook URL");
      if (webhook.hostname !== "discord.com" && webhook.hostname !== "discordapp.com") {
        return NextResponse.json({ error: "Webhook musi prowadzić do domeny Discord." }, { status: 400 });
      }
    }

    const now = new Date();
    await getCollection("integration_configs").then((items) =>
      items.updateOne(
        { provider: integration.id },
        {
          $set: {
            values: plainValues,
            encryptedSecrets,
            configuredFields: [...configuredFields],
            updatedAt: now,
            updatedBy: auth.user._id,
          },
          $setOnInsert: { provider: integration.id, createdAt: now },
          $unset: { checkStatus: "", checkMessage: "", checkedAt: "" },
        },
        { upsert: true },
      ),
    );
    await writeAuditLog({
      actorId: auth.user._id,
      action: "owner.integration.configure",
      entity: "integration_configs",
      entityId: integration.id,
    });
    return NextResponse.json({ success: true, message: `${integration.label}: konfiguracja zapisana.` });
  } catch (error) {
    console.error("Owner integration save failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: "Nie udało się zapisać ustawień. Sprawdź połączenie MongoDB i klucz SESSION_SECRET." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }

  const parsed = await readJsonBody(request, 4_096);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  if (
    !isRecord(body) ||
    body.action !== "test" ||
    typeof body.provider !== "string"
  ) {
    return NextResponse.json({ error: "Nieprawidłowa akcja integracji." }, { status: 400 });
  }
  const integration = ownerIntegrations.find((item) => item.id === body.provider);
  if (!integration) {
    return NextResponse.json({ error: "Nieznana integracja." }, { status: 400 });
  }

  try {
    const config = await getOwnerIntegrationConfig(integration.id);
    if (!config) {
      return NextResponse.json({ error: "Najpierw zapisz konfigurację tej integracji." }, { status: 400 });
    }
    const values: IntegrationValues = { ...(config.values ?? {}) };
    for (const [key, encrypted] of Object.entries(config.encryptedSecrets ?? {})) {
      values[key] = decryptOwnerSecret(encrypted);
    }
    if (!configured(values, integration.id)) {
      return NextResponse.json({ error: "Uzupełnij wymagane pola przed testem." }, { status: 400 });
    }
    if (
      integration.id === "render" &&
      !(values.apiKey && values.serviceId) &&
      values.deployHook
    ) {
      await writeAuditLog({
        actorId: auth.user._id,
        action: "owner.integration.test_deploy_hook_not_executed",
        entity: "integration_configs",
        entityId: integration.id,
      });
      return NextResponse.json({
        success: true,
        verified: false,
        message: "Deploy Hook zapisany. Bezpieczny TEST nie wywołuje hooka, bo uruchomiłby wdrożenie. Użyj DEPLOY, aby go uruchomić.",
      });
    }
    const message = await testIntegration(integration.id, values);
    await updateTestResult(integration.id, "connected", message);
    await writeAuditLog({
      actorId: auth.user._id,
      action: "owner.integration.test",
      entity: "integration_configs",
      entityId: integration.id,
    });
    return NextResponse.json({ success: true, message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test integracji nie powiódł się.";
    await updateTestResult(integration.id, "unavailable", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }
  const provider = new URL(request.url).searchParams.get("provider");
  if (!provider || !ownerIntegrations.some((item) => item.id === provider)) {
    return NextResponse.json({ error: "Nieznana integracja." }, { status: 400 });
  }
  await getCollection("integration_configs").then((items) => items.deleteOne({ provider }));
  await getCollection("integrations").then((items) =>
    items.updateOne(
      { provider },
      { $set: { status: "unconfigured", verification: "not_checked", updatedAt: new Date() } },
    ),
  );
  await writeAuditLog({
    actorId: auth.user._id,
    action: "owner.integration.remove",
    entity: "integration_configs",
    entityId: provider,
  });
  return NextResponse.json({ success: true });
}

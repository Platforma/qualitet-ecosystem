import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../lib/server/auth";
import {
  isOwnerIntegrationConfigured,
  ownerIntegrations,
} from "../../../lib/owner-integrations";
import {
  getOwnerIntegrationSummaries,
  getOwnerIntegrationValues,
} from "../../../lib/server/owner-config";
import { getCollection } from "../../../lib/server/database";

const ecosystemDomains = [
  { domain: "qualitet-market.com", service: "qualitet-henryk-command-center" },
  { domain: "admin.qualitet-market.com", service: "qualitet-henryk-command-center" },
  { domain: "shop.qualitet-market.com", service: "qualitet-shop-builder" },
  { domain: "ai.qualitet-market.com", service: "qualitet-ai-backend" },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeDisplayUrl(value: string) {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

async function getCloudflareStatus() {
  const config = await getOwnerIntegrationValues("cloudflare");
  const apiToken = config?.apiToken?.trim() ?? "";
  const zoneId = config?.zoneId?.trim() ?? "";
  const domains = ecosystemDomains.map(({ domain, service }) => ({
    domain,
    service,
    dns: null as boolean | null,
    proxied: null as boolean | null,
  }));
  if (!apiToken || !zoneId) {
    return {
      configured: false,
      zoneAvailable: null,
      sslMode: null,
      domains,
      error: null,
    };
  }

  const headers = { Authorization: `Bearer ${apiToken}` };
  try {
    const [zoneResponse, sslResponse, ...recordResponses] = await Promise.all([
      fetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }),
      fetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/settings/ssl`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }),
      ...domains.map(({ domain }) =>
        fetch(
          `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/dns_records?${new URLSearchParams({ name: domain, per_page: "100" })}`,
          {
            headers,
            cache: "no-store",
            signal: AbortSignal.timeout(8_000),
          },
        ),
      ),
    ]);
    const [zoneResult, sslResult, ...recordResults] = await Promise.all([
      zoneResponse.json(),
      sslResponse.json(),
      ...recordResponses.map((response) => response.json()),
    ]) as unknown[];
    if (
      !zoneResponse.ok ||
      !sslResponse.ok ||
      !isRecord(zoneResult) ||
      zoneResult.success !== true ||
      !isRecord(sslResult) ||
      sslResult.success !== true
    ) {
      throw new Error("Cloudflare API nie udostępniło statusu strefy i SSL.");
    }

    const sslMode =
      isRecord(sslResult.result) && typeof sslResult.result.value === "string"
        ? sslResult.result.value
        : null;
    for (const [index, result] of recordResults.entries()) {
      const domainStatus = domains[index];
      if (!domainStatus || !isRecord(result) || result.success !== true || !Array.isArray(result.result)) {
        continue;
      }
      const records = result.result.filter(isRecord);
      domainStatus.dns = records.length > 0;
      domainStatus.proxied = records.some((record) => record.proxied === true);
    }

    return {
      configured: true,
      zoneAvailable: true,
      sslMode,
      domains,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      zoneAvailable: false,
      sslMode: null,
      domains,
      error: error instanceof Error ? error.message : "Cloudflare API jest niedostępne.",
    };
  }
}

async function getAiRuntimeStatus() {
  const backendUrl = process.env.AI_BACKEND_URL?.trim();
  const token = process.env.AI_API_TOKEN?.trim();
  if (!backendUrl || !token) {
    return {
      enabledAgentCount: null,
      memory: null,
      checkedAt: null,
      error: "AI_BACKEND_URL lub AI_API_TOKEN nie jest skonfigurowane.",
    };
  }

  try {
    const url = new URL("/api/ai/status", backendUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      throw new Error("AI_BACKEND_URL musi używać HTTPS.");
    }
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const result: unknown = await response.json();
    if (!response.ok || !isRecord(result)) {
      throw new Error(`AI Backend zwrócił HTTP ${response.status}.`);
    }
    return {
      enabledAgentCount:
        typeof result.enabledAgentCount === "number" ? result.enabledAgentCount : null,
      memory:
        typeof result.memory === "string" ? result.memory : null,
      checkedAt: typeof result.checkedAt === "string" ? result.checkedAt : null,
      error: null,
    };
  } catch (error) {
    return {
      enabledAgentCount: null,
      memory: null,
      checkedAt: null,
      error: error instanceof Error ? error.message : "AI Backend jest niedostępny.",
    };
  }
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }

  try {
    const summaries = await getOwnerIntegrationSummaries();
    const [ollamaConfig, cloudflare, aiRuntime, activeAgents] = await Promise.all([
      getOwnerIntegrationValues("ollama"),
      getCloudflareStatus(),
      getAiRuntimeStatus(),
      getCollection("ai_agents").then((items) =>
        items.countDocuments({ status: "running" }),
      ),
    ]);
    return NextResponse.json(
      {
        checkedAt: new Date().toISOString(),
        integrations: ownerIntegrations.map((integration) => {
          const config = summaries.get(integration.id);
          const fields = config?.configuredFields ?? [];
          const configured = isOwnerIntegrationConfigured(integration.id, fields);
          return {
            id: integration.id,
            state: config?.checkStatus ?? (configured ? "unavailable" : "unconfigured"),
            configured,
            message: config?.checkMessage ?? (configured ? "Wymaga testu połączenia" : "Brak konfiguracji"),
            checkedAt: config?.checkedAt ?? null,
          };
        }),
        env: {
          MONGODB_URI: Boolean(process.env.MONGODB_URI?.trim()),
          OLLAMA_URL: Boolean(process.env.OLLAMA_URL?.trim()),
          OLLAMA_MODEL: Boolean(process.env.OLLAMA_MODEL?.trim()),
          AI_API_TOKEN: Boolean(process.env.AI_API_TOKEN?.trim()),
          OWNER_EMAIL: Boolean(process.env.OWNER_EMAIL?.trim()),
          SHOP_OWNER_EMAIL: Boolean(process.env.SHOP_OWNER_EMAIL?.trim()),
        },
        ollama: {
          url: safeDisplayUrl(ollamaConfig?.baseUrl ?? process.env.OLLAMA_URL ?? ""),
          model: ollamaConfig?.model ?? process.env.OLLAMA_MODEL ?? "",
          status: summaries.get("ollama")?.checkStatus ?? null,
          checkMessage: summaries.get("ollama")?.checkMessage ?? null,
          checkedAt: summaries.get("ollama")?.checkedAt ?? null,
          activeAgents: aiRuntime?.enabledAgentCount ?? activeAgents,
          memory: aiRuntime?.memory ?? null,
          aiBackendCheckedAt: aiRuntime?.checkedAt ?? null,
          aiBackendError: aiRuntime?.error ?? null,
        },
        cloudflare,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Integration status load failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: "Nie udało się odczytać statusów integracji." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

import { MongoClient } from "mongodb";
import { connection, NextResponse } from "next/server";

type IntegrationState = "connected" | "unavailable" | "unconfigured";

type IntegrationStatus = {
  id: string;
  state: IntegrationState;
  message: string;
};

type IntegrationsResponse = {
  checkedAt: string;
  integrations: IntegrationStatus[];
};

const cacheDurationMs = 30_000;
let cachedResponse: { expiresAt: number; body: IntegrationsResponse } | null =
  null;
let pendingCheck: Promise<IntegrationsResponse> | null = null;

async function checkHttpEndpoint(
  url: string,
  headers: HeadersInit,
  validate?: (response: Response) => Promise<boolean>,
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });

    return response.ok && (validate ? await validate(response) : true);
  } catch {
    return false;
  }
}

async function checkMongoDb(uri: string): Promise<boolean> {
  const client = new MongoClient(uri, {
    connectTimeoutMS: 4_000,
    maxPoolSize: 1,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 4_000,
  });

  try {
    await client.connect();
    await client.db().admin().command({ ping: 1 });
    return true;
  } catch {
    return false;
  } finally {
    try {
      await client.close();
    } catch {
      // The connection status is already determined by the ping result.
    }
  }
}

function getOllamaTagsUrl(configuredUrl: string): string | null {
  try {
    const url = new URL(configuredUrl);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    const basePath = url.pathname.replace(/\/+$/, "").replace(/\/api$/, "");
    url.pathname = `${basePath}/api/tags`;
    return url.toString();
  } catch {
    return null;
  }
}

function createStatus(
  id: string,
  isConfigured: boolean,
  isConnected: boolean,
): IntegrationStatus {
  if (!isConfigured) {
    return { id, state: "unconfigured", message: "Brak konfiguracji serwera" };
  }

  return isConnected
    ? { id, state: "connected", message: "Połączenie potwierdzone" }
    : { id, state: "unavailable", message: "Nie udało się potwierdzić połączenia" };
}

async function checkIntegrations(): Promise<IntegrationsResponse> {
  const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN;
  const mongodbUri = process.env.MONGODB_URI;
  const ollamaTagsUrl = process.env.OLLAMA_URL
    ? getOllamaTagsUrl(process.env.OLLAMA_URL)
    : null;
  const renderApiKey = process.env.RENDER_API_KEY;
  const githubToken = process.env.GITHUB_PAT;

  const [cloudflare, mongodb, ollama, render, github] = await Promise.all([
    cloudflareToken
      ? checkHttpEndpoint(
          "https://api.cloudflare.com/client/v4/user/tokens/verify",
          { Authorization: `Bearer ${cloudflareToken}` },
          async (response) => {
            const result: unknown = await response.json();
            return (
              typeof result === "object" &&
              result !== null &&
              "success" in result &&
              result.success === true
            );
          },
        )
      : Promise.resolve(false),
    mongodbUri ? checkMongoDb(mongodbUri) : Promise.resolve(false),
    ollamaTagsUrl
      ? checkHttpEndpoint(ollamaTagsUrl, {})
      : Promise.resolve(false),
    renderApiKey
      ? checkHttpEndpoint("https://api.render.com/v1/owners?limit=1", {
          Authorization: `Bearer ${renderApiKey}`,
        })
      : Promise.resolve(false),
    githubToken
      ? checkHttpEndpoint(
          "https://api.github.com/user",
          {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${githubToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        )
      : Promise.resolve(false),
  ]);

  return {
    checkedAt: new Date().toISOString(),
    integrations: [
      createStatus("cloudflare", Boolean(cloudflareToken), cloudflare),
      createStatus("mongodb", Boolean(mongodbUri), mongodb),
      createStatus("ollama", Boolean(ollamaTagsUrl), ollama),
      createStatus("render", Boolean(renderApiKey), render),
      createStatus("github", Boolean(githubToken), github),
    ],
  };
}

export async function GET() {
  try {
    await connection();

    if (cachedResponse && cachedResponse.expiresAt > Date.now()) {
      return NextResponse.json(cachedResponse.body, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    pendingCheck ??= checkIntegrations()
      .then((body) => {
        cachedResponse = { body, expiresAt: Date.now() + cacheDurationMs };
        return body;
      })
      .finally(() => {
        pendingCheck = null;
      });

    const body = await pendingCheck;
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Nie udało się sprawdzić statusu integracji." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

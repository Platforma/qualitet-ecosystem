import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/server/auth";
import { readJsonBody } from "../../../../lib/server/request";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getAiConfiguration() {
  const backend = process.env.AI_BACKEND_URL?.trim();
  const token = process.env.AI_API_TOKEN?.trim();
  if (!backend || !token) return null;
  let url: URL;
  try {
    url = new URL(backend);
  } catch {
    throw new Error("AI_BACKEND_URL is not a valid URL.");
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("AI_BACKEND_URL must use HTTPS.");
  }
  return { url, token };
}

async function callAiBackend(path: string, init?: RequestInit) {
  const configuration = getAiConfiguration();
  if (!configuration) {
    return NextResponse.json(
      { error: "Usługa AI nie jest skonfigurowana." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const url = new URL(path, configuration.url);
    const response = await fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${configuration.token}`,
      },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body === null) {
      return NextResponse.json(
        { error: "Usługa AI zwróciła nieprawidłową odpowiedź." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(body, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Nie udało się połączyć z usługą AI." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  return callAiBackend("/api/ai/health");
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  const parsed = await readJsonBody(request, 32 * 1024);
  if (!parsed.ok) return parsed.response;
  if (
    !isRecord(parsed.body) ||
    Object.keys(parsed.body).some(
      (key) => !["prompt", "agent", "messages"].includes(key),
    ) ||
    typeof parsed.body.prompt !== "string" ||
    !parsed.body.prompt.trim() ||
    parsed.body.prompt.length > 20_000 ||
    (parsed.body.agent !== undefined &&
      (typeof parsed.body.agent !== "string" || parsed.body.agent.length > 100)) ||
    (parsed.body.messages !== undefined &&
      (!Array.isArray(parsed.body.messages) ||
        parsed.body.messages.length > 50 ||
        parsed.body.messages.some(
          (message) =>
            !isRecord(message) ||
            (message.role !== "user" && message.role !== "assistant") ||
            typeof message.content !== "string" ||
            message.content.length > 20_000,
        )))
  ) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane żądania AI." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  return callAiBackend("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.body),
  });
}
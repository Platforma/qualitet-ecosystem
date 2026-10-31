import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../../../lib/server/auth";
import { isPromptFile, listProjectTextFiles, readProjectTextFile, writeProjectTextFile } from "../../../../../lib/server/owner-files";
import { getCollection, writeAuditLog } from "../../../../../lib/server/database";
import { readJsonBody } from "../../../../../lib/server/request";
import type { Document } from "mongodb";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validPromptPath(value: unknown): value is string {
  return typeof value === "string" && isPromptFile(value);
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });

  const path = new URL(request.url).searchParams.get("path");
  if (path) {
    if (!validPromptPath(path)) return NextResponse.json({ error: "Nieprawidłowa ścieżka promptu." }, { status: 400 });
    const file = await readProjectTextFile(path);
    if (!file) return NextResponse.json({ error: "Nie znaleziono promptu." }, { status: 404 });
    const defaults = getCollection<{ _id: string; content: string } & Document>("owner_settings");
    await defaults.then((items) => items.updateOne(
      { _id: `prompt-default:${path}` },
      { $setOnInsert: { content: file.content, createdAt: new Date() } },
      { upsert: true },
    ));
    return NextResponse.json({ path: file.relativePath, content: file.content }, { headers: { "Cache-Control": "no-store" } });
  }

  const files = (await listProjectTextFiles()).filter((file) => isPromptFile(file.path));
  return NextResponse.json({ prompts: files }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });

  const parsed = await readJsonBody(request, 40 * 1024);
  if (!parsed.ok) return parsed.response;
  if (!isRecord(parsed.body) || typeof parsed.body.action !== "string") return NextResponse.json({ error: "Nieprawidłowa akcja." }, { status: 400 });
  const { action, path } = parsed.body;
  if (!validPromptPath(path)) return NextResponse.json({ error: "Nieprawidłowa ścieżka promptu." }, { status: 400 });

  if (action === "save") {
    if (typeof parsed.body.content !== "string") return NextResponse.json({ error: "Prompt musi być tekstem." }, { status: 400 });
    const saved = await writeProjectTextFile(path, parsed.body.content);
    if (!saved) return NextResponse.json({ error: "Nie udało się zapisać promptu." }, { status: 400 });
    await writeAuditLog({ actorId: auth.user._id, action: "settings.prompt.update", entity: "ai_prompt", entityId: path });
    return NextResponse.json({ success: true });
  }

  if (action === "reset") {
    const defaults = await getCollection<{ _id: string; content: string } & Document>("owner_settings");
    const original = await defaults.findOne({ _id: `prompt-default:${path}` });
    if (!original || typeof original.content !== "string") return NextResponse.json({ error: "Nie zapisano jeszcze domyślnej wersji tego promptu." }, { status: 404 });
    const saved = await writeProjectTextFile(path, original.content);
    if (!saved) return NextResponse.json({ error: "Nie udało się przywrócić promptu." }, { status: 400 });
    await writeAuditLog({ actorId: auth.user._id, action: "settings.prompt.reset", entity: "ai_prompt", entityId: path });
    return NextResponse.json({ success: true, content: original.content });
  }

  if (action === "test") {
    const prompt = await readProjectTextFile(path);
    if (!prompt) return NextResponse.json({ error: "Nie znaleziono promptu." }, { status: 404 });
    const promptContent = typeof parsed.body.content === "string"
      ? parsed.body.content
      : prompt.content;
    if (promptContent.length > 30_000 || promptContent.includes("\0")) {
      return NextResponse.json({ error: "Prompt jest zbyt długi lub nieprawidłowy." }, { status: 400 });
    }
    const config = await getCollection<{ _id: string } & Document>("owner_settings").then((items) => items.findOne({ _id: "system-config" }));
    const baseUrl = String(config?.OLLAMA_URL ?? process.env.OLLAMA_URL ?? "").trim();
    const model = String(config?.OLLAMA_MODEL ?? process.env.OLLAMA_MODEL ?? "").trim();
    if (!baseUrl || !model) return NextResponse.json({ error: "Ustaw OLLAMA URL i model w System Config." }, { status: 400 });
    try {
      const url = new URL(baseUrl);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return NextResponse.json({ error: "Nieprawidłowy OLLAMA URL." }, { status: 400 });
      url.pathname = `${url.pathname.replace(/\/+$/, "").replace(/\/api$/, "")}/api/generate`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: `${promptContent}\n\nTest: odpowiedz jednym zdaniem, że prompt działa.`, stream: false }),
        signal: AbortSignal.timeout(60_000),
        cache: "no-store",
      });
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result) || typeof result.response !== "string") return NextResponse.json({ error: "Ollama nie zwróciła poprawnej odpowiedzi." }, { status: 502 });
      return NextResponse.json({ result: result.response });
    } catch {
      return NextResponse.json({ error: "Nie udało się przetestować promptu z Ollama." }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Nieznana akcja." }, { status: 400 });
}
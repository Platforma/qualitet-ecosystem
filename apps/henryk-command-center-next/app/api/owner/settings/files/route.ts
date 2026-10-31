import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../../../lib/server/auth";
import {
  listProjectTextFiles,
  readProjectTextFile,
  writeProjectTextFile,
} from "../../../../../lib/server/owner-files";
import { getCollection, writeAuditLog } from "../../../../../lib/server/database";
import { readJsonBody } from "../../../../../lib/server/request";
import type { Document } from "mongodb";

type ReplacementTarget = { path: string; hash: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function contentHash(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function countOccurrences(content: string, search: string) {
  return content.split(search).length - 1;
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });

  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (path) {
    const file = await readProjectTextFile(path);
    if (!file) return NextResponse.json({ error: "Nie znaleziono pliku lub dostęp jest ograniczony." }, { status: 404 });
    return NextResponse.json({ path: file.relativePath, content: file.content, size: file.size }, { headers: { "Cache-Control": "no-store" } });
  }

  const search = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const files = await listProjectTextFiles();
  if (!search) return NextResponse.json({ files }, { headers: { "Cache-Control": "no-store" } });
  const matches = [];
  for (const file of files) {
    if (file.path.toLowerCase().includes(search)) {
      matches.push({ path: file.path, size: file.size, modifiedAt: file.modifiedAt });
    } else {
      const content = await readProjectTextFile(file.path);
      if (content?.content.toLowerCase().includes(search)) {
        matches.push({ path: file.path, size: file.size, modifiedAt: file.modifiedAt });
      }
    }
    if (matches.length >= 200) break;
  }
  return NextResponse.json({ files: matches }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });

  const parsed = await readJsonBody(request, 32 * 1024);
  if (!parsed.ok) return parsed.response;
  if (!isRecord(parsed.body) || typeof parsed.body.action !== "string") {
    return NextResponse.json({ error: "Nieprawidłowa akcja." }, { status: 400 });
  }

  if (parsed.body.action === "preview-replace") {
    const { search, replacement } = parsed.body;
    if (
      typeof search !== "string" || !search.trim() || search.length > 2000 ||
      typeof replacement !== "string" || replacement.length > 2000 ||
      search.includes("\0") || replacement.includes("\0")
    ) {
      return NextResponse.json({ error: "Wpisz poprawny tekst do wyszukania i zamiany." }, { status: 400 });
    }

    const files = await listProjectTextFiles();
    const changes: { path: string; count: number; hash: string; preview: string }[] = [];
    for (const file of files) {
      const current = await readProjectTextFile(file.path);
      if (!current) continue;
      const count = countOccurrences(current.content, search);
      if (!count) continue;
      changes.push({
        path: current.relativePath,
        count,
        hash: contentHash(current.content),
        preview: current.content.split(search).join(replacement).slice(0, 1200),
      });
      if (changes.length >= 100) break;
    }

    return NextResponse.json(
      { changes, totalMatches: changes.reduce((total, item) => total + item.count, 0), truncated: changes.length === 100 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (parsed.body.action === "apply-replace") {
    const { search, replacement, targets } = parsed.body;
    if (
      typeof search !== "string" || !search.trim() || search.length > 2000 ||
      typeof replacement !== "string" || replacement.length > 2000 ||
      !Array.isArray(targets) || targets.length === 0 || targets.length > 100 ||
      search.includes("\0") || replacement.includes("\0") ||
      !targets.every((target): target is ReplacementTarget =>
        isRecord(target) && typeof target.path === "string" &&
        typeof target.hash === "string" && /^[a-f0-9]{64}$/.test(target.hash),
      )
    ) {
      return NextResponse.json({ error: "Nieprawidłowe dane zatwierdzenia zmian." }, { status: 400 });
    }

    const uniquePaths = new Set(targets.map(({ path }) => path));
    if (uniquePaths.size !== targets.length) {
      return NextResponse.json({ error: "Lista plików zawiera duplikaty." }, { status: 400 });
    }

    const prepared: { path: string; original: string; updated: string }[] = [];
    for (const target of targets) {
      const current = await readProjectTextFile(target.path);
      if (!current) return NextResponse.json({ error: `Plik ${target.path} nie jest dostępny.` }, { status: 400 });
      if (contentHash(current.content) !== target.hash) {
        return NextResponse.json({ error: `Plik ${target.path} zmienił się od podglądu. Wykonaj podgląd ponownie.` }, { status: 409 });
      }
      if (!current.content.includes(search)) {
        return NextResponse.json({ error: `Tekst do zamiany nie występuje już w ${target.path}.` }, { status: 409 });
      }
      prepared.push({
        path: current.relativePath,
        original: current.content,
        updated: current.content.split(search).join(replacement),
      });
    }

    for (const item of prepared) {
      const saved = await writeProjectTextFile(item.path, item.updated);
      if (!saved) {
        return NextResponse.json({ error: `Nie udało się zapisać ${item.path}; sprawdź stan plików przed ponowieniem.` }, { status: 500 });
      }
    }
    await writeAuditLog({
      actorId: auth.user._id,
      action: "settings.files.find_replace",
      entity: "project_files",
      entityId: String(prepared.length),
    });
    return NextResponse.json({ success: true, filesChanged: prepared.length });
  }

  if (parsed.body.action === "ai-propose") {
    const { instruction, path } = parsed.body;
    if (
      typeof instruction !== "string" || instruction.trim().length < 3 ||
      instruction.length > 2000 || typeof path !== "string"
    ) {
      return NextResponse.json({ error: "Wpisz polecenie i wybierz plik tekstowy." }, { status: 400 });
    }
    const file = await readProjectTextFile(path);
    if (!file) return NextResponse.json({ error: "Nie znaleziono pliku lub dostęp jest ograniczony." }, { status: 404 });
    if (file.content.length > 60_000) {
      return NextResponse.json({ error: "Wybierz plik o rozmiarze do 60 KB do edycji przez AI." }, { status: 413 });
    }

    const config = await getCollection<{ _id: string } & Document>("owner_settings")
      .then((items) => items.findOne({ _id: "system-config" }));
    const baseUrl = String(config?.OLLAMA_URL ?? process.env.OLLAMA_URL ?? "").trim();
    const model = String(config?.OLLAMA_MODEL ?? process.env.OLLAMA_MODEL ?? "").trim();
    if (!baseUrl || !model) {
      return NextResponse.json({ error: "Skonfiguruj OLLAMA URL i model w System Config." }, { status: 400 });
    }

    try {
      const url = new URL(baseUrl);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
        return NextResponse.json({ error: "Nieprawidłowy OLLAMA URL." }, { status: 400 });
      }
      url.pathname = `${url.pathname.replace(/\/+$/, "").replace(/\/api$/, "")}/api/generate`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          prompt: [
            "You are a code editor. Modify only the supplied file according to the owner's request.",
            "Return only the complete updated file contents. Do not use markdown fences or explanations.",
            "Do not add shell commands, credentials, secrets, or unrelated functionality.",
            "If the request cannot be safely completed within this file, return the original file unchanged.",
            `OWNER REQUEST:\n${instruction.trim()}`,
            `FILE PATH:\n${file.relativePath}`,
            `CURRENT FILE CONTENT:\n${file.content}`,
          ].join("\n\n"),
        }),
        signal: AbortSignal.timeout(90_000),
        cache: "no-store",
      });
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result) || typeof result.response !== "string") {
        return NextResponse.json({ error: "Ollama nie zwróciła poprawnej propozycji." }, { status: 502 });
      }
      const proposal = result.response.replace(/^```[^\n]*\n/, "").replace(/\n```$/, "");
      if (proposal.length > 512 * 1024 || proposal.includes("\0")) {
        return NextResponse.json({ error: "Propozycja AI jest za duża lub nieprawidłowa." }, { status: 502 });
      }
      return NextResponse.json({
        path: file.relativePath,
        original: file.content,
        proposal,
        changed: proposal !== file.content,
      }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? `Nie udało się uzyskać propozycji: ${error.message}` : "Nie udało się uzyskać propozycji AI." },
        { status: 502 },
      );
    }
  }

  if (parsed.body.action === "ai-locate") {
    const instruction = parsed.body.instruction;
    if (typeof instruction !== "string" || instruction.trim().length < 3 || instruction.length > 2000) {
      return NextResponse.json({ error: "Wpisz polecenie zmiany." }, { status: 400 });
    }
    const config = await getCollection<{ _id: string } & Document>("owner_settings")
      .then((items) => items.findOne({ _id: "system-config" }));
    const baseUrl = String(config?.OLLAMA_URL ?? process.env.OLLAMA_URL ?? "").trim();
    const model = String(config?.OLLAMA_MODEL ?? process.env.OLLAMA_MODEL ?? "").trim();
    if (!baseUrl || !model) {
      return NextResponse.json({ error: "Skonfiguruj OLLAMA URL i model w System Config." }, { status: 400 });
    }

    try {
      const candidates = (await listProjectTextFiles())
        .filter((file) => /\.(css|tsx|jsx|html|ts|js)$/i.test(file.path))
        .sort((left, right) => {
          const preferred = (path: string) => /(^|\/)(page|layout)\.(tsx|jsx|html)$|globals\.css$/i.test(path) ? 1 : 0;
          return preferred(right.path) - preferred(left.path) || left.path.localeCompare(right.path);
        })
        .slice(0, 40);
      const context = [];
      for (const candidate of candidates) {
        const file = await readProjectTextFile(candidate.path);
        if (file) context.push(`${file.relativePath}\n${file.content.slice(0, 700)}`);
      }

      const url = new URL(baseUrl);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
        return NextResponse.json({ error: "Nieprawidłowy OLLAMA URL." }, { status: 400 });
      }
      url.pathname = `${url.pathname.replace(/\/+$/, "").replace(/\/api$/, "")}/api/generate`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          prompt: [
            "Choose exactly one file from the supplied project snippets that is the best target for the owner's change request.",
            "Return only its exact relative path, with no markdown or explanation. Never invent a path.",
            `OWNER REQUEST:\n${instruction.trim()}`,
            `CANDIDATE FILES:\n${context.join("\n\n---\n\n")}`,
          ].join("\n\n"),
        }),
        signal: AbortSignal.timeout(90_000),
        cache: "no-store",
      });
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result) || typeof result.response !== "string") {
        return NextResponse.json({ error: "Ollama nie wskazała pliku do zmiany." }, { status: 502 });
      }
      const selectedPath = result.response.trim().replace(/^`|`$/g, "");
      const file = context.length > 0 && candidates.some((candidate) => candidate.path === selectedPath)
        ? await readProjectTextFile(selectedPath)
        : null;
      if (!file) return NextResponse.json({ error: "AI nie wskazało jednego z bezpiecznych plików projektu. Wybierz plik ręcznie w Files Center." }, { status: 422 });
      if (file.content.length > 60_000) {
        return NextResponse.json({ error: "Wybrany plik jest za duży do edycji przez AI." }, { status: 413 });
      }
      return NextResponse.json({ path: file.relativePath }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? `Nie udało się znaleźć pliku: ${error.message}` : "Nie udało się znaleźć pliku przez AI." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ error: "Nieznana akcja." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });

  const parsed = await readJsonBody(request, 600 * 1024);
  if (!parsed.ok) return parsed.response;
  if (
    typeof parsed.body !== "object" || parsed.body === null ||
    !("path" in parsed.body) || typeof parsed.body.path !== "string" ||
    !("content" in parsed.body) || typeof parsed.body.content !== "string"
  ) return NextResponse.json({ error: "Nieprawidłowa zawartość pliku." }, { status: 400 });

  try {
    const saved = await writeProjectTextFile(parsed.body.path, parsed.body.content);
    if (!saved) return NextResponse.json({ error: "Plik nie może zostać zapisany." }, { status: 400 });
    await writeAuditLog({ actorId: auth.user._id, action: "settings.file.update", entity: "project_file", entityId: parsed.body.path });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Nie udało się zapisać pliku." }, { status: 500 });
  }
}
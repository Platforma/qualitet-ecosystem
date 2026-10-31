import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../../../lib/server/auth";
import {
  listProjectTextFiles,
  readProjectTextFile,
  writeProjectTextFile,
} from "../../../../../lib/server/owner-files";
import { writeAuditLog } from "../../../../../lib/server/database";
import { readJsonBody } from "../../../../../lib/server/request";

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
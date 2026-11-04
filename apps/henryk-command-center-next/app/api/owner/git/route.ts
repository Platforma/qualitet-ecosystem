import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../../lib/server/auth";
import { writeAuditLog } from "../../../../lib/server/database";
import { getProjectRoot, resolveProjectFile } from "../../../../lib/server/owner-files";
import { readJsonBody } from "../../../../lib/server/request";

const execFileAsync = promisify(execFile);
const ownerCoauthor = "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>";

async function runGit(args: string[]) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: getProjectRoot(),
    timeout: 20_000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  return stdout.trim();
}

async function changedFiles() {
  const output = await runGit(["status", "--porcelain=v1", "-z", "--untracked-files=normal"]);
  return output.split("\0").filter(Boolean).map((entry) => ({
    status: entry.slice(0, 2).trim() || "??",
    path: entry.slice(3),
  }));
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }

  try {
    const [branch, files, history] = await Promise.all([
      runGit(["branch", "--show-current"]),
      changedFiles(),
      runGit(["log", "-10", "--format=%H%x09%s%x09%cr"]),
    ]);
    const commits = history.split(/\r?\n/).filter(Boolean).map((line) => {
      const [hash, subject, age] = line.split("\t");
      return { hash, subject, age };
    });
    return NextResponse.json({
      available: true,
      branch,
      files,
      commits,
      dirty: files.length > 0,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      available: false,
      error: error instanceof Error ? error.message : "Repozytorium Git jest niedostępne w tym środowisku.",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }

  const parsed = await readJsonBody(request, 32 * 1024);
  if (!parsed.ok) return parsed.response;
  if (typeof parsed.body !== "object" || parsed.body === null || !("action" in parsed.body) || typeof parsed.body.action !== "string") {
    return NextResponse.json({ error: "Nieprawidłowa akcja Git." }, { status: 400 });
  }

  try {
    const { action } = parsed.body;
    if (action === "commit") {
      if (!("message" in parsed.body) || typeof parsed.body.message !== "string" ||
          !parsed.body.message.trim() || parsed.body.message.length > 120 ||
          !("files" in parsed.body) || !Array.isArray(parsed.body.files) ||
          parsed.body.files.length === 0 || parsed.body.files.length > 50 ||
          !parsed.body.files.every((path) => typeof path === "string")) {
        return NextResponse.json({ error: "Wybierz zmienione pliki i wpisz opis commita (do 120 znaków)." }, { status: 400 });
      }

      const paths = [...new Set(parsed.body.files as string[])];
      const current = await changedFiles();
      const changed = new Set(current.map(({ path }) => path));
      for (const path of paths) {
        if (!changed.has(path) || !(await resolveProjectFile(path))) {
          return NextResponse.json({ error: `Plik ${path} nie jest zmienionym, dozwolonym plikiem projektu.` }, { status: 400 });
        }
      }
      await runGit(["add", "--", ...paths]);
      await runGit(["commit", "-m", `${parsed.body.message.trim()}\n\n${ownerCoauthor}`]);
      await writeAuditLog({ actorId: auth.user._id, action: "owner.git.commit", entity: "git", entityId: paths.join(",").slice(0, 500) });
      return NextResponse.json({ success: true, result: "Commit utworzony dla wybranych plików." });
    }

    if (action === "push") {
      const branch = await runGit(["branch", "--show-current"]);
      if (branch !== "main") return NextResponse.json({ error: "Push jest dozwolony wyłącznie z gałęzi main." }, { status: 409 });
      const result = await runGit(["push", "origin", "main"]);
      await writeAuditLog({ actorId: auth.user._id, action: "owner.git.push", entity: "git", entityId: "main" });
      return NextResponse.json({ success: true, result: result || "Push do origin/main zakończony." });
    }

    if (action === "pull") {
      if ((await changedFiles()).length > 0) {
        return NextResponse.json({ error: "Najpierw zapisz lub odrzuć lokalne zmiany. Pull wymaga czystego worktree." }, { status: 409 });
      }
      const branch = await runGit(["branch", "--show-current"]);
      if (branch !== "main") return NextResponse.json({ error: "Pull jest dozwolony wyłącznie na gałęzi main." }, { status: 409 });
      const result = await runGit(["pull", "--ff-only", "origin", "main"]);
      await writeAuditLog({ actorId: auth.user._id, action: "owner.git.pull", entity: "git", entityId: "main" });
      return NextResponse.json({ success: true, result: result || "Fast-forward pull zakończony." });
    }

    if (action === "revert") {
      if (!("hash" in parsed.body) || typeof parsed.body.hash !== "string" || !/^[a-f0-9]{7,40}$/i.test(parsed.body.hash)) {
        return NextResponse.json({ error: "Nieprawidłowy identyfikator commita." }, { status: 400 });
      }
      if ((await changedFiles()).length > 0) {
        return NextResponse.json({ error: "Rollback wymaga czystego worktree; najpierw obsłuż lokalne zmiany." }, { status: 409 });
      }
      const branch = await runGit(["branch", "--show-current"]);
      if (branch !== "main") return NextResponse.json({ error: "Rollback jest dozwolony wyłącznie na gałęzi main." }, { status: 409 });
      const hash = await runGit(["show", "-s", "--format=%H", parsed.body.hash]);
      await runGit(["merge-base", "--is-ancestor", hash, "HEAD"]);
      const result = await runGit(["revert", "--no-edit", hash]);
      await writeAuditLog({ actorId: auth.user._id, action: "owner.git.revert", entity: "git", entityId: hash });
      return NextResponse.json({ success: true, result: result || `Commit ${hash.slice(0, 7)} został odwrócony nowym commitem.` });
    }

    return NextResponse.json({ error: "Nieznana akcja Git." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operacja Git nie powiodła się." },
      { status: 500 },
    );
  }
}

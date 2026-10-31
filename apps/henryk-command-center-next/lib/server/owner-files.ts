import { lstat, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".vercel",
  ".turbo",
  "node_modules",
  "backups",
  "backup",
  "uploads",
  "logs",
  "dist",
  "build",
]);
const textExtensions = new Set([
  ".cjs", ".css", ".csv", ".html", ".js", ".json", ".jsx", ".md",
  ".mjs", ".ps1", ".py", ".sh", ".sql", ".svg", ".toml", ".ts",
  ".tsx", ".txt", ".xml", ".yaml", ".yml",
]);
const maximumFileBytes = 512 * 1024;

export function getProjectRoot() {
  return resolve(process.cwd(), "..", "..");
}

function isSensitivePath(path: string) {
  const segments = path.split(/[\\/]/);
  return segments.some((segment) =>
    /^\.env($|\.)/i.test(segment) ||
    /(^|\.)(secret|secrets|credentials|private-key|id_rsa)(\.|$)/i.test(segment),
  );
}

function isTextFile(path: string) {
  return textExtensions.has(resolve(path).slice(resolve(path).lastIndexOf("." )).toLowerCase());
}

export function isPromptFile(path: string) {
  return /^ai[\\/]/i.test(path) && /prompt/i.test(path) && isTextFile(path) && !isSensitivePath(path);
}

export async function resolveProjectFile(input: string) {
  if (!input || input.length > 500 || input.includes("\0")) return null;
  const normalized = input.replace(/\\/g, "/");
  const parts = normalized.split("/");
  if (
    normalized.startsWith("/") ||
    /^[a-z]:/i.test(normalized) ||
    parts.some((part) => !part || part === "." || part === "..") ||
    isSensitivePath(normalized) ||
    !isTextFile(normalized)
  ) {
    return null;
  }

  const root = await realpath(getProjectRoot());
  const target = resolve(root, ...parts);
  if (!target.startsWith(`${root}${sep}`)) return null;
  try {
    const [resolved, details] = await Promise.all([realpath(target), stat(target)]);
    if (!resolved.startsWith(`${root}${sep}`) || !details.isFile() || details.size > maximumFileBytes) {
      return null;
    }
    return { absolutePath: resolved, relativePath: normalized, size: details.size };
  } catch {
    return null;
  }
}

export async function listProjectTextFiles() {
  const root = await realpath(getProjectRoot());
  const files: { path: string; size: number; modifiedAt: string }[] = [];
  const pending = [root];
  while (pending.length > 0 && files.length < 10_000) {
    const directory = pending.pop();
    if (!directory) continue;
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const absolutePath = resolve(directory, entry.name);
      const path = relative(root, absolutePath).split(sep).join("/");
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name.toLowerCase()) && !isSensitivePath(path)) {
          pending.push(absolutePath);
        }
        continue;
      }
      if (!entry.isFile() || isSensitivePath(path) || !isTextFile(path)) continue;
      try {
        const details = await lstat(absolutePath);
        if (details.size <= maximumFileBytes) {
          files.push({ path, size: details.size, modifiedAt: details.mtime.toISOString() });
        }
      } catch {
        continue;
      }
      if (files.length >= 10_000) break;
    }
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export async function readProjectTextFile(path: string) {
  const file = await resolveProjectFile(path);
  if (!file) return null;
  return { ...file, content: await readFile(file.absolutePath, "utf8") };
}

export async function writeProjectTextFile(path: string, content: string) {
  const file = await resolveProjectFile(path);
  if (!file || content.length > maximumFileBytes || content.includes("\0")) return false;
  await writeFile(file.absolutePath, content, "utf8");
  return true;
}

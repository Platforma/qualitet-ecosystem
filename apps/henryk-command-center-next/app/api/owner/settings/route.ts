import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { connection, NextResponse } from "next/server";
import type { Document } from "mongodb";
import { hasRole, requireUser } from "../../../../lib/server/auth";
import { getCollection, getDatabase, writeAuditLog } from "../../../../lib/server/database";
import { readJsonBody } from "../../../../lib/server/request";

const configKeys = [
  "APP_NAME",
  "DOMAIN",
  "EMAIL",
  "OWNER_EMAIL",
  "OLLAMA_MODEL",
  "OLLAMA_URL",
] as const;
const integrationProviders = [
  "cloudflare",
  "render",
  "github",
  "discord",
  "facebook",
  "google_ads",
  "stripe",
  "allegro",
  "olx",
] as const;
const collectionNamePattern = /^[a-z][a-z0-9_]{1,62}$/;
const protectedCollections = new Set([
  "users",
  "auth_sessions",
  "auth_attempts",
  "audit_logs",
  "owner_settings",
  "integrations",
  "system_health",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function secretKey() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("Nie można bezpiecznie zapisać sekretu integracji.");
  }
  return createHash("sha256").update(secret).digest();
}

function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

function currentConfig(stored: Document | null) {
  const defaults: Record<(typeof configKeys)[number], string> = {
    APP_NAME: "Qualitet",
    DOMAIN: "qualitet-market.com",
    EMAIL: "",
    OWNER_EMAIL: process.env.OWNER_EMAIL ?? "",
    OLLAMA_MODEL: process.env.OLLAMA_MODEL ?? "",
    OLLAMA_URL: process.env.OLLAMA_URL ?? "",
  };
  return Object.fromEntries(
    configKeys.map((key) => [
      key,
      typeof stored?.[key] === "string"
        ? stored[key]
        : process.env[key] ?? defaults[key],
    ]),
  );
}

function validateConfig(value: unknown) {
  if (!isRecord(value) || Object.keys(value).length === 0) return null;
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      !(configKeys as readonly string[]).includes(key) ||
      typeof item !== "string" ||
      item.length > 500 ||
      item.includes("\0")
    ) {
      return null;
    }
    result[key] = item.trim();
  }
  return result;
}

function sanitizeImportRecord(value: Record<string, unknown>): Document | null {
  const record: Document = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "_id") continue;
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)) return null;
    if (typeof item === "string" && (item.length > 50_000 || item.includes("\0"))) {
      return null;
    }
    record[key] = item;
  }
  return Object.keys(record).length > 0 ? record : null;
}

async function loadSnapshot() {
  const database = await getDatabase();
  const settings = await getCollection<{ _id: string } & Document>("owner_settings").then((items) =>
    items.findOne({ _id: "system-config" }),
  );
  const [integrations, agents, collections] = await Promise.all([
    getCollection("integrations").then((items) =>
      items.find({}, { projection: { secretEncrypted: 0 } }).toArray(),
    ),
    getCollection("ai_agents").then((items) =>
      items.find({}, { projection: { passwordHash: 0 } }).sort({ name: 1 }).limit(200).toArray(),
    ),
    database.listCollections({}, { nameOnly: true }).toArray(),
  ]);
  return {
    config: currentConfig(settings),
    integrations: integrationProviders.map((provider) => {
      const saved = integrations.find((item) => item.provider === provider);
      return {
        provider,
        status: saved?.status ?? "unconfigured",
        displayName: typeof saved?.displayName === "string" ? saved.displayName : "",
        accountName: typeof saved?.accountName === "string" ? saved.accountName : "",
        endpoint: typeof saved?.endpoint === "string" ? saved.endpoint : "",
        webhookUrl: typeof saved?.webhookUrl === "string" ? saved.webhookUrl : "",
        publicKey: typeof saved?.publicKey === "string" ? saved.publicKey : "",
        hasSecret: typeof saved?.secretEncrypted === "string",
      };
    }),
    agents: agents.map((agent) => ({
      _id: String(agent._id),
      agentId: String(agent.agentId ?? agent._id),
      name: String(agent.name ?? agent.agentId ?? "Agent"),
      model: typeof agent.model === "string" ? agent.model : "",
      role: typeof agent.role === "string" ? agent.role : "",
      prompt: typeof agent.prompt === "string" ? agent.prompt : "",
      status: typeof agent.status === "string" ? agent.status : "unknown",
    })),
    database: {
      name: database.databaseName,
      collections: collections.map(({ name }) => name).sort(),
    },
  };
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }

  try {
    await connection();
    const url = new URL(request.url);
    const exportName = url.searchParams.get("export");
    if (exportName) {
      if (!collectionNamePattern.test(exportName) || protectedCollections.has(exportName)) {
        return NextResponse.json({ error: "Nie można eksportować tej kolekcji." }, { status: 400 });
      }
      const records = await getCollection(exportName).then((items) =>
        items.find({}).limit(10_000).toArray(),
      );
      const payload = JSON.stringify(records, null, 2);
      return new Response(payload, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${exportName}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json(await loadSnapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się odczytać ustawień." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }

  const parsed = await readJsonBody(request, 2 * 1024 * 1024);
  if (!parsed.ok) return parsed.response;
  if (!isRecord(parsed.body) || typeof parsed.body.action !== "string") {
    return NextResponse.json({ error: "Nieprawidłowa akcja." }, { status: 400 });
  }

  try {
    const body = parsed.body;
    const now = new Date();
    if (body.action === "save-config") {
      const values = validateConfig(body.values);
      if (!values) return NextResponse.json({ error: "Nieprawidłowe ustawienia systemu." }, { status: 400 });
      await getCollection<{ _id: string } & Document>("owner_settings").then((items) =>
        items.updateOne(
          { _id: "system-config" },
          { $set: { ...values, updatedAt: now, updatedBy: auth.user._id }, $setOnInsert: { createdAt: now } },
          { upsert: true },
        ),
      );
      await writeAuditLog({ actorId: auth.user._id, action: "settings.config.update", entity: "owner_settings" });
      return NextResponse.json({ success: true });
    }

    if (body.action === "save-integration") {
      if (typeof body.provider !== "string" || !(integrationProviders as readonly string[]).includes(body.provider) || !isRecord(body.values)) {
        return NextResponse.json({ error: "Nieprawidłowa integracja." }, { status: 400 });
      }
      const allowed = new Set(["displayName", "accountName", "endpoint", "webhookUrl", "publicKey"]);
      const values: Record<string, string> = {};
      for (const [key, value] of Object.entries(body.values)) {
        if (!allowed.has(key) || typeof value !== "string" || value.length > 1000 || value.includes("\0")) {
          return NextResponse.json({ error: "Nieprawidłowe pole integracji." }, { status: 400 });
        }
        values[key] = value.trim();
      }
      const update: Document = { ...values, updatedAt: now, updatedBy: auth.user._id };
      if (typeof body.secret === "string" && body.secret.length > 0) {
        if (body.secret.length > 4000 || body.secret.includes("\0")) return NextResponse.json({ error: "Sekret jest nieprawidłowy." }, { status: 400 });
        update.secretEncrypted = encryptSecret(body.secret);
      }
      await getCollection("integrations").then((items) =>
        items.updateOne(
          { provider: body.provider },
          { $set: update, $setOnInsert: { provider: body.provider, status: "unconfigured", createdAt: now } },
          { upsert: true },
        ),
      );
      await writeAuditLog({ actorId: auth.user._id, action: "settings.integration.update", entity: "integrations", entityId: body.provider });
      return NextResponse.json({ success: true });
    }

    if (body.action === "update-agent") {
      if (typeof body.agentId !== "string" || !isRecord(body.values) || Object.keys(body.values).length === 0) {
        return NextResponse.json({ error: "Nieprawidłowy agent." }, { status: 400 });
      }
      const values: Record<string, string> = {};
      for (const [key, value] of Object.entries(body.values)) {
        if (!["prompt", "model", "role"].includes(key) || typeof value !== "string" || value.length > 30_000 || value.includes("\0")) {
          return NextResponse.json({ error: "Nieprawidłowe pole agenta." }, { status: 400 });
        }
        values[key] = value.trim();
      }
      const result = await getCollection("ai_agents").then((items) =>
        items.updateOne({ agentId: body.agentId }, { $set: { ...values, updatedAt: now } }),
      );
      if (result.matchedCount === 0) return NextResponse.json({ error: "Nie znaleziono agenta." }, { status: 404 });
      await writeAuditLog({ actorId: auth.user._id, action: "settings.agent.update", entity: "ai_agents", entityId: body.agentId });
      return NextResponse.json({ success: true });
    }

    if (body.action === "create-collection" || body.action === "drop-collection") {
      const name = body.name;
      if (typeof name !== "string" || !collectionNamePattern.test(name) || protectedCollections.has(name)) {
        return NextResponse.json({ error: "Nazwa kolekcji jest niedozwolona." }, { status: 400 });
      }
      const database = await getDatabase();
      if (body.action === "create-collection") await database.createCollection(name);
      else await database.dropCollection(name);
      await writeAuditLog({ actorId: auth.user._id, action: `settings.collection.${body.action === "create-collection" ? "create" : "drop"}`, entity: name });
      return NextResponse.json({ success: true });
    }

    if (body.action === "create-document" || body.action === "add-field") {
      const name = body.name;
      if (typeof name !== "string" || !collectionNamePattern.test(name) || protectedCollections.has(name)) {
        return NextResponse.json({ error: "Nazwa kolekcji jest niedozwolona." }, { status: 400 });
      }
      const database = await getDatabase();
      const exists = await database.listCollections({ name }, { nameOnly: true }).hasNext();
      if (!exists) return NextResponse.json({ error: "Nie znaleziono kolekcji." }, { status: 404 });

      if (body.action === "create-document") {
        const document = isRecord(body.document) ? sanitizeImportRecord(body.document) : null;
        if (!document) return NextResponse.json({ error: "Dokument zawiera nieprawidłowe dane." }, { status: 400 });
        const result = await getCollection(name).then((items) =>
          items.insertOne({ ...document, createdAt: now, updatedAt: now, createdBy: auth.user._id }),
        );
        await writeAuditLog({ actorId: auth.user._id, action: "settings.collection.document.create", entity: name, entityId: String(result.insertedId) });
        return NextResponse.json({ success: true, id: String(result.insertedId) }, { status: 201 });
      }

      const field = body.field;
      const value = body.value;
      if (
        typeof field !== "string" || !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(field) ||
        ["_id", "createdAt", "createdBy", "updatedAt", "updatedBy", "archivedAt", "passwordHash"].includes(field) ||
        !["string", "number", "boolean"].includes(typeof value) ||
        (typeof value === "string" && (value.length > 10_000 || value.includes("\0"))) ||
        (typeof value === "number" && !Number.isFinite(value))
      ) {
        return NextResponse.json({ error: "Pole musi mieć bezpieczną nazwę i wartość tekstową, liczbową lub logiczną." }, { status: 400 });
      }
      const result = await getCollection(name).then((items) =>
        items.updateMany(
          { [field]: { $exists: false }, archivedAt: { $exists: false } },
          { $set: { [field]: value, updatedAt: now, updatedBy: auth.user._id } },
        ),
      );
      await writeAuditLog({ actorId: auth.user._id, action: "settings.collection.field.add", entity: name, entityId: field });
      return NextResponse.json({ success: true, modified: result.modifiedCount });
    }

    if (body.action === "import-collection") {
      const name = body.name;
      if (typeof name !== "string" || !collectionNamePattern.test(name) || protectedCollections.has(name) || !Array.isArray(body.records) || body.records.length > 1000) {
        return NextResponse.json({ error: "Nieprawidłowy import kolekcji." }, { status: 400 });
      }
      const documents = body.records.map((record) => isRecord(record) ? sanitizeImportRecord(record) : null);
      if (documents.some((record) => record === null)) return NextResponse.json({ error: "Import zawiera nieprawidłowe dokumenty." }, { status: 400 });
      if (documents.length > 0) await getCollection(name).then((items) => items.insertMany(documents as Document[]));
      await writeAuditLog({ actorId: auth.user._id, action: "settings.collection.import", entity: name });
      return NextResponse.json({ success: true, imported: documents.length });
    }

    return NextResponse.json({ error: "Nieznana akcja." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operacja nie powiodła się.";
    return NextResponse.json({ error: message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
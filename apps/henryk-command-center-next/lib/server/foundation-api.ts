import { randomUUID } from "node:crypto";
import { MongoServerError, ObjectId, type Document } from "mongodb";
import { foundationCollections } from "../models/foundation";
import { getCollection, writeAuditLog } from "./database";
import { readJsonBody } from "./request";
import { requirePermission } from "./permissions";

type FoundationCollection = (typeof foundationCollections)[number];
type Payload = Record<string, unknown>;

const writableFields: Partial<Record<FoundationCollection, readonly string[]>> = {
  companies: [
    "name",
    "slug",
    "email",
    "phone",
    "website",
    "country",
    "type",
    "categories",
    "marketingConsent",
    "status",
  ],
  suppliers: ["companyId", "contactName", "email", "status"],
  partners: ["companyId", "userId", "status"],
  advertisers: ["companyId", "userId", "status"],
  campaigns: [
    "name",
    "advertiserId",
    "budget",
    "currency",
    "startsAt",
    "endsAt",
    "status",
  ],
  products: [
    "name",
    "description",
    "sku",
    "price",
    "currency",
    "supplierCompanyId",
    "storeId",
    "status",
  ],
  categories: ["name", "slug", "description", "parentId"],
  ai_tasks: ["agentId", "input"],
  ai_memory: ["key", "type", "content", "tags"],
};

const requiredFields: Partial<Record<FoundationCollection, readonly string[]>> = {
  companies: ["name"],
  suppliers: ["companyId"],
  campaigns: ["name", "advertiserId"],
  products: ["name"],
  categories: ["name", "slug"],
  ai_tasks: ["agentId"],
  ai_memory: ["key", "type", "content"],
};

const statusDefaults: Partial<Record<FoundationCollection, string>> = {
  companies: "pending",
  suppliers: "pending",
  partners: "pending",
  advertisers: "pending",
  campaigns: "draft",
  products: "draft",
};

const statusOptions: Partial<Record<FoundationCollection, readonly string[]>> = {
  companies: ["pending", "active", "rejected", "suspended"],
  suppliers: ["active", "pending", "suspended", "archived"],
  partners: ["active", "pending", "suspended", "archived"],
  advertisers: ["active", "pending", "suspended", "archived"],
  campaigns: ["draft", "active", "paused", "completed"],
  products: ["active", "draft", "archived"],
};

const privateFields = new Set([
  "passwordHash",
  "encryptedSecrets",
  "sessionId",
  "accessToken",
  "refreshToken",
]);

function isFoundationCollection(value: string): value is FoundationCollection {
  return (foundationCollections as readonly string[]).includes(value);
}

function isPayload(value: unknown): value is Payload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizePayload(
  collection: FoundationCollection,
  payload: unknown,
): Payload | Response {
  const fields = writableFields[collection];
  if (!fields) {
    return Response.json(
      { error: "Ten zasób nie obsługuje zapisu przez to API." },
      { status: 405, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!isPayload(payload) || Object.keys(payload).length === 0) {
    return Response.json(
      { error: "Treść żądania musi być niepustym obiektem JSON." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (Object.keys(payload).some((key) => !fields.includes(key))) {
    return Response.json(
      { error: "Żądanie zawiera nieobsługiwane pola." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const normalized: Payload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "type") {
      const companyTypes = [
        "manufacturer",
        "wholesaler",
        "importer",
        "distributor",
        "brand",
      ];
      if (typeof value !== "string" || !companyTypes.includes(value)) {
        return Response.json(
          { error: "Nieprawidłowy typ firmy." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      normalized[key] = value;
      continue;
    }
    if (typeof value === "string") {
      const text = value.trim();
      if (
        !text ||
        text.length > (key === "description" ? 10_000 : 2_000) ||
        (key === "name" && (text.length < 2 || text.length > 200)) ||
        (key === "slug" && !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(text)) ||
        (key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))
      ) {
        return Response.json(
          { error: `Pole ${key} ma nieprawidłową wartość.` },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      normalized[key] = text;
      continue;
    }
    if (["price", "budget"].includes(key)) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return Response.json(
          { error: `Pole ${key} musi być nieujemną liczbą.` },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      normalized[key] = value;
      continue;
    }
    if (key === "marketingConsent") {
      if (typeof value !== "boolean") {
        return Response.json(
          { error: "Pole marketingConsent musi być wartością logiczną." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      normalized[key] = value;
      continue;
    }
    if (key === "categories" || key === "tags") {
      if (
        !Array.isArray(value) ||
        value.length > 100 ||
        value.some((entry) => typeof entry !== "string" || !entry.trim())
      ) {
        return Response.json(
          { error: `Pole ${key} musi być tablicą tekstów.` },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      normalized[key] = value.map((entry) =>
        typeof entry === "string" ? entry.trim() : "",
      );
      continue;
    }
    if (key === "input") {
      if (!isPayload(value)) {
        return Response.json(
          { error: "Pole input musi być obiektem JSON." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      normalized[key] = value;
      continue;
    }
    return Response.json(
      { error: `Pole ${key} ma nieobsługiwany typ.` },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  for (const key of requiredFields[collection] ?? []) {
    if (!(key in normalized)) {
      return Response.json(
        { error: `Pole ${key} jest wymagane.` },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  if (typeof normalized.currency === "string") {
    if (!/^[A-Za-z]{3}$/.test(normalized.currency)) {
      return Response.json(
        { error: "Pole currency musi być kodem ISO składającym się z 3 liter." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    normalized.currency = normalized.currency.toUpperCase();
  }
  if ("status" in normalized) {
    if (!(statusOptions[collection] ?? []).includes(String(normalized.status))) {
      return Response.json(
        { error: "Nieprawidłowy status zasobu." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
  } else if (statusDefaults[collection]) {
    normalized.status = statusDefaults[collection];
  }
  for (const key of ["startsAt", "endsAt"]) {
    if (key in normalized) {
      const date = new Date(String(normalized[key]));
      if (!Number.isFinite(date.getTime())) {
        return Response.json(
          { error: `Pole ${key} musi być prawidłową datą.` },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      normalized[key] = date;
    }
  }
  return normalized;
}

function publicDocument(document: Document) {
  const result: Record<string, unknown> = { ...document, id: String(document._id) };
  delete result._id;
  for (const key of privateFields) delete result[key];
  return result;
}

export async function handleFoundationCollection(
  request: Request,
  collectionName: string,
) {
  if (!isFoundationCollection(collectionName)) {
    return Response.json(
      { error: "Nieznany zasób API." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "POST") {
    return Response.json(
      { error: "Metoda nie jest obsługiwana." },
      { status: 405, headers: { Allow: "GET, POST", "Cache-Control": "no-store" } },
    );
  }
  const auth = await requirePermission(
    request,
    method === "GET" ? "resources:read" : "resources:write",
  );
  if ("response" in auth) return auth.response;

  const collection = await getCollection<Document>(collectionName);
  if (method === "GET") {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? 50);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
      return Response.json(
        { error: "Parametr limit musi być liczbą całkowitą od 1 do 100." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const items = await collection
      .find({}, { projection: { passwordHash: 0, encryptedSecrets: 0 } })
      .sort({ createdAt: -1 })
      .limit(requestedLimit)
      .toArray();
    return Response.json(
      { items: items.map(publicDocument) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const input = sanitizePayload(collectionName, parsed.body);
  if (input instanceof Response) return input;
  const now = new Date();
  const document: Document = {
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  if (collectionName === "companies") document.ownerUserId = auth.user._id;
  if (collectionName === "stores") document.ownerUserId = auth.user._id;
  if (collectionName === "products") document.createdBy = auth.user._id;
  if (collectionName === "partners" || collectionName === "advertisers") {
    document.userId ??= auth.user._id;
  }
  if (collectionName === "ai_tasks") {
    document.taskId = randomUUID();
    document.status = "queued";
  }
  if (collectionName === "ai_memory") {
    document.ownerId = auth.user._id;
  }
  if (collectionName === "categories" && !document.status) {
    document.status = "active";
  }
  if (collectionName === "suppliers") {
    document.status ??= "pending";
  }
  if (collectionName === "partners" || collectionName === "advertisers") {
    document.status ??= "pending";
  }

  let insertedId: ObjectId;
  try {
    insertedId = (await collection.insertOne(document)).insertedId;
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return Response.json(
        { error: "Zasób o podanym kluczu już istnieje." },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }
  const id = String(insertedId);
  await writeAuditLog({
    actorId: auth.user._id,
    action: `${collectionName}.create`,
    entity: collectionName,
    entityId: id,
  });
  return Response.json(
    { item: publicDocument({ ...document, _id: insertedId }) },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}

export async function handleFoundationItem(
  request: Request,
  collectionName: string,
  id: string,
) {
  if (!isFoundationCollection(collectionName)) {
    return Response.json(
      { error: "Nieznany zasób API." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!ObjectId.isValid(id)) {
    return Response.json(
      { error: "Nieprawidłowy identyfikator zasobu." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (request.method !== "GET") {
    return Response.json(
      { error: "Metoda nie jest obsługiwana." },
      { status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" } },
    );
  }
  const auth = await requirePermission(request, "resources:read");
  if ("response" in auth) return auth.response;
  const item = await getCollection<Document>(collectionName).then((collection) =>
    collection.findOne(
      { _id: new ObjectId(id) },
      { projection: { passwordHash: 0, encryptedSecrets: 0 } },
    ),
  );
  if (!item) {
    return Response.json(
      { error: "Nie znaleziono zasobu." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    { item: publicDocument(item) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

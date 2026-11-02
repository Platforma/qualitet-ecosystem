import { randomUUID } from "node:crypto";
import { ObjectId, type Document } from "mongodb";
import { NextResponse } from "next/server";
import {
  hasRole,
  requireUser,
  type UserRole,
} from "../../../../lib/server/auth";
import { productStatuses } from "../../../../lib/models/product";
import { getCollection, writeAuditLog } from "../../../../lib/server/database";
import { readJsonBody } from "../../../../lib/server/request";

const collectionFields: Record<string, Set<string>> = {
  ai_agents: new Set(["agentId", "name", "status", "description"]),
  ai_tasks: new Set(["taskId", "agentId", "status", "title"]),
  memory_entries: new Set(["key", "type", "content", "metadata"]),
  integrations: new Set(["provider", "status", "displayName"]),
  audit_logs: new Set(["actorId", "action", "entity", "entityId", "createdAt"]),
  system_health: new Set(["status", "checkedAt", "components"]),
  companies: new Set(["name", "website", "industry", "phone", "email", "notes"]),
  crm_contacts: new Set(["name", "email", "phone", "companyId", "title", "notes"]),
  leads: new Set(["name", "email", "phone", "companyId", "status", "source", "notes"]),
  products: new Set(["name", "description", "sku", "price", "currency", "status", "storeId"]),
  stores: new Set(["name", "domain", "platform", "status"]),
  marketplace_ads: new Set(["title", "marketplace", "externalId", "status", "url", "productId"]),
};

const writableCollections = new Set([
  "companies",
  "crm_contacts",
  "leads",
  "products",
  "stores",
  "marketplace_ads",
]);
const ownerOnlyCollections = new Set([
  "users",
  "ai_agents",
  "ai_tasks",
  "memory_entries",
  "integrations",
  "audit_logs",
  "system_health",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeDocument(document: Document) {
  const safeDocument = { ...document };
  delete safeDocument.passwordHash;
  return {
    ...safeDocument,
    _id: String(document._id),
    createdAt:
      document.createdAt instanceof Date
        ? document.createdAt.toISOString()
        : document.createdAt,
    updatedAt:
      document.updatedAt instanceof Date
        ? document.updatedAt.toISOString()
        : document.updatedAt,
    checkedAt:
      document.checkedAt instanceof Date
        ? document.checkedAt.toISOString()
        : document.checkedAt,
  };
}

function validateCreateInput(
  collection: string,
  value: unknown,
  partial = false,
): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  const allowedFields = collectionFields[collection];
  if (
    !allowedFields ||
    Object.keys(value).length === 0 ||
    Object.keys(value).some((key) => !allowedFields.has(key))
  ) {
    return null;
  }

  const requiredField =
    collection === "companies" ||
    collection === "crm_contacts" ||
    collection === "leads" ||
    collection === "products" ||
    collection === "stores"
      ? "name"
      : collection === "marketplace_ads"
        ? "title"
        : null;
  if (
    requiredField &&
    (value[requiredField] !== undefined || !partial) &&
    (typeof value[requiredField] !== "string" ||
      value[requiredField].trim().length === 0 ||
      value[requiredField].trim().length > 500)
  ) {
    return null;
  }
  if (
    collection === "marketplace_ads" &&
    (value.marketplace !== undefined || !partial) &&
    (typeof value.marketplace !== "string" ||
      value.marketplace.trim().length === 0 ||
      value.marketplace.trim().length > 120)
  ) {
    return null;
  }
  if (
    collection === "leads" &&
    value.status !== undefined &&
    (typeof value.status !== "string" ||
      !["NEW", "CONTACTED", "OPENED", "CLICKED", "REGISTERED", "ACTIVE", "REJECTED",
        "new", "contacted", "opened", "clicked", "registered", "active", "rejected",
        "qualified", "converted", "lost"].includes(value.status))
  ) {
    return null;
  }
  if (
    collection === "products" &&
    value.status !== undefined &&
    !productStatuses.some((status) => status === value.status)
  ) {
    return null;
  }
  if (
    value.email !== undefined &&
    (typeof value.email !== "string" ||
      value.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))
  ) {
    return null;
  }
  if (value.price !== undefined && (typeof value.price !== "number" || value.price < 0)) {
    return null;
  }
  if (
    Object.values(value).some(
      (field) =>
        typeof field === "string" &&
        (field.length > 10_000 || field.includes("\0")),
    )
  ) {
    return null;
  }
  return value;
}

function isAllowedCollection(collection: string) {
  return collection === "users" || collectionFields[collection] !== undefined;
}

function roleCanRead(userRole: UserRole, collection: string) {
  return !ownerOnlyCollections.has(collection) || userRole === "owner";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string }> },
) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const { collection } = await params;
  if (!isAllowedCollection(collection) || !roleCanRead(auth.user.role, collection)) {
    return NextResponse.json(
      { error: "Brak dostępu do tej kolekcji." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const limitValue = Number(new URL(request.url).searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(limitValue)
    ? Math.min(100, Math.max(1, Math.floor(limitValue)))
    : 50;
  const items = await getCollection(collection);
  const documents = await items
    .find(
      { archivedAt: { $exists: false } },
      { projection: { passwordHash: 0 } },
    )
    .sort({ createdAt: -1, checkedAt: -1 })
    .limit(limit)
    .toArray();
  return NextResponse.json(
    { collection, items: documents.map(sanitizeDocument), limit },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ collection: string }> },
) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const { collection } = await params;
  if (
    !writableCollections.has(collection) ||
    !hasRole(auth.user, ["owner", "admin"])
  ) {
    return NextResponse.json(
      { error: "Brak uprawnień do tworzenia rekordów w tej kolekcji." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const input = validateCreateInput(collection, body);
  if (!input) {
    return NextResponse.json(
      { error: "Dane rekordu są nieprawidłowe lub zawierają niedozwolone pola." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const now = new Date();
  const companySlug =
    typeof input.name === "string"
      ? input.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
          .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
          .slice(0, 100)
      : "company";
  const legacyLeadStatusMap: Record<string, string> = {
    qualified: "CONTACTED",
    converted: "REGISTERED",
    lost: "REJECTED",
  };
  const rawLeadStatus = typeof input.status === "string" ? input.status.toLowerCase() : "";
  const record: Document = {
    ...input,
    ...(collection === "companies"
      ? {
          slug: `${companySlug || "company"}-${randomUUID().slice(0, 8)}`,
          email: input.email ?? "",
          phone: input.phone ?? "",
          website: input.website ?? "",
          country: "PL",
          type: "brand",
          categories: [],
          status: "active",
          commissionDefault: 0,
          adBudget: 0,
          productsCount: 0,
          salesCount: 0,
          marketingConsent: false,
        }
      : {}),
    ...(collection === "leads"
      ? {
          companyName: input.companyName ?? input.name,
          status: legacyLeadStatusMap[rawLeadStatus] ?? (rawLeadStatus ? rawLeadStatus.toUpperCase() : "NEW"),
          marketingConsent: false,
        }
      : {}),
    ...(collection === "products" ? { status: input.status ?? "draft" } : {}),
    ...(collection === "stores" ? { status: input.status ?? "active" } : {}),
    ...(collection === "marketplace_ads"
      ? {
          marketplace: input.marketplace,
          status: input.status ?? "draft",
        }
      : {}),
    createdAt: now,
    updatedAt: now,
    createdBy: auth.user._id,
  };
  const result = await getCollection(collection).then((items) =>
    items.insertOne(record),
  );
  await writeAuditLog({
    actorId: auth.user._id,
    action: "record.create",
    entity: collection,
    entityId: String(result.insertedId),
  });
  return NextResponse.json(
    { item: sanitizeDocument({ ...record, _id: result.insertedId }) },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ collection: string }> },
) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  const { collection } = await params;
  if (
    !writableCollections.has(collection) ||
    !hasRole(auth.user, ["owner", "admin"])
  ) {
    return NextResponse.json(
      { error: "Brak uprawnień do aktualizacji tej kolekcji." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Nieprawidłowy identyfikator rekordu." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const patch = validateCreateInput(collection, body, true);
  if (!patch) {
    return NextResponse.json(
      { error: "Dane aktualizacji są nieprawidłowe." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await getCollection(collection).then((items) =>
    items.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...patch, updatedAt: new Date() } },
    ),
  );
  if (result.matchedCount === 0) {
    return NextResponse.json(
      { error: "Nie znaleziono rekordu." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  await writeAuditLog({
    actorId: auth.user._id,
    action: "record.update",
    entity: collection,
    entityId: id,
  });
  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ collection: string }> },
) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  const { collection } = await params;
  if (
    !writableCollections.has(collection) ||
    !hasRole(auth.user, ["owner"])
  ) {
    return NextResponse.json(
      { error: "Do archiwizacji tej kolekcji wymagane są uprawnienia właściciela." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Nieprawidłowy identyfikator rekordu." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await getCollection(collection).then((items) =>
    items.updateOne(
      { _id: new ObjectId(id), archivedAt: { $exists: false } },
      { $set: { archivedAt: new Date(), updatedAt: new Date() } },
    ),
  );
  if (result.matchedCount === 0) {
    return NextResponse.json(
      { error: "Nie znaleziono aktywnego rekordu." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  await writeAuditLog({
    actorId: auth.user._id,
    action: "record.archive",
    entity: collection,
    entityId: id,
  });
  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

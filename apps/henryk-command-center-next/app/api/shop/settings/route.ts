import { ObjectId, type Document } from "mongodb";
import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/server/auth";
import { getCollection, writeAuditLog } from "../../../../lib/server/database";
import { readJsonBody } from "../../../../lib/server/request";

type ShopSettingsRecord = Document & {
  _id: string;
  settings?: {
    storeId?: string;
    locale?: string;
    notificationsEnabled?: boolean;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  const settings = await getCollection<ShopSettingsRecord>("owner_settings").then(
    (collection) => collection.findOne({ _id: `shop:${auth.user._id}` }),
  );
  return NextResponse.json(
    { settings: settings?.settings ?? {} },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  const parsed = await readJsonBody(request, 16_384);
  if (!parsed.ok) return parsed.response;
  if (
    !isRecord(parsed.body) ||
    Object.keys(parsed.body).length === 0 ||
    Object.keys(parsed.body).some(
      (key) => !["storeId", "locale", "notificationsEnabled"].includes(key),
    ) ||
    (parsed.body.storeId !== undefined &&
      (typeof parsed.body.storeId !== "string" ||
        !ObjectId.isValid(parsed.body.storeId))) ||
    (parsed.body.locale !== undefined &&
      (typeof parsed.body.locale !== "string" ||
        !/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(parsed.body.locale))) ||
    (parsed.body.notificationsEnabled !== undefined &&
      typeof parsed.body.notificationsEnabled !== "boolean")
  ) {
    return NextResponse.json(
      { error: "Nieprawidłowe ustawienia sklepu." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const settings = Object.fromEntries(
    Object.entries(parsed.body).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  );
  const now = new Date();
  await getCollection<ShopSettingsRecord>("owner_settings").then((collection) =>
    collection.updateOne(
      { _id: `shop:${auth.user._id}` },
      {
        $set: { settings, updatedAt: now },
        $setOnInsert: { createdAt: now, ownerId: auth.user._id },
      },
      { upsert: true },
    ),
  );
  await writeAuditLog({
    actorId: auth.user._id,
    action: "shop.settings.update",
    entity: "owner_settings",
    entityId: `shop:${auth.user._id}`,
  });
  return NextResponse.json(
    { settings },
    { headers: { "Cache-Control": "no-store" } },
  );
}
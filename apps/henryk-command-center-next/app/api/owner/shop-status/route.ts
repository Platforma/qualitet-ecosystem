import { ObjectId, type Document } from "mongodb";
import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/server/auth";
import { getCollection } from "../../../../lib/server/database";

type ShopSettings = Document & {
  _id: string;
  settings?: { storeId?: string };
};

type StoreRecord = Document & {
  name: string;
  status: string;
};

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const settings = await getCollection<ShopSettings>("owner_settings").then(
    (collection) => collection.findOne({ _id: `shop:${auth.user._id}` }),
  );
  const storeId = settings?.settings?.storeId;
  const store =
    storeId && ObjectId.isValid(storeId)
      ? await getCollection<StoreRecord>("stores").then((collection) =>
          collection.findOne({
            _id: new ObjectId(storeId),
            ownerUserId: auth.user._id,
          }),
        )
      : null;

  return NextResponse.json(
    {
      status: store?.status ?? "not_configured",
      active: store?.status === "active",
      store: store ? { id: String(store._id), name: store.name } : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
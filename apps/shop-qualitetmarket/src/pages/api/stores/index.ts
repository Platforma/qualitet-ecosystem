import type { NextApiRequest, NextApiResponse } from "next";
import { createStore, listStoresForOwner } from "../../../server/store-repository";
import { getShopOwner } from "../../../server/shop-auth";
import { hasSameOrigin, isRecord } from "../../../server/shop-request";
import { normalizeStoreSettings } from "../../../models/store";

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export default async function storesHandler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  const owner = await getShopOwner(request);
  if (!owner) {
    return response.status(401).json({ error: "Wymagane jest zalogowanie." });
  }

  if (request.method === "GET") {
    try {
      const stores = await listStoresForOwner(owner.id);
      return response.status(200).json({
        stores: stores.map((store) => ({
          id: String(store._id),
          name: store.name,
          slug: store.slug,
          status: store.status,
        })),
      });
    } catch (error) {
      console.error(
        "Shop store listing failed:",
        error instanceof Error ? error.name : "UnknownError",
      );
      return response.status(503).json({ error: "Nie udało się odczytać sklepów." });
    }
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "Metoda niedozwolona." });
  }
  if (!hasSameOrigin(request)) {
    return response.status(403).json({ error: "Nieprawidłowe źródło żądania." });
  }

  const body: unknown = request.body;
  if (
    !isRecord(body) ||
    typeof body.name !== "string" ||
    typeof body.slug !== "string"
  ) {
    return response.status(400).json({ error: "Podaj nazwę i slug sklepu." });
  }

  try {
    const store = await createStore({
      ownerUserId: owner.id,
      name: body.name,
      slug: body.slug,
      settings: normalizeStoreSettings(body.settings),
    });
    return response.status(201).json({ store: { id: String(store._id) } });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return response.status(409).json({
        error: "Sklep o takim slug lub domenie już istnieje.",
      });
    }
    if (error instanceof TypeError || error instanceof RangeError) {
      return response.status(400).json({ error: error.message });
    }
    console.error(
      "Shop store creation failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return response.status(503).json({ error: "Nie udało się utworzyć sklepu." });
  }
}

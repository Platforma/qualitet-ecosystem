import type { NextApiRequest, NextApiResponse } from "next";
import { createProductForStore } from "../../../../server/shop-catalog";
import { getShopOwner } from "../../../../server/shop-auth";
import { hasSameOrigin, isRecord } from "../../../../server/shop-request";
import { findOwnedStoreById } from "../../../../server/store-repository";

export default async function productsHandler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Metoda niedozwolona." });
  }
  if (!hasSameOrigin(request)) {
    return response.status(403).json({ error: "Nieprawidłowe źródło żądania." });
  }
  const owner = await getShopOwner(request);
  if (!owner) {
    return response.status(401).json({ error: "Wymagane jest zalogowanie." });
  }
  const storeId = request.query.id;
  if (typeof storeId !== "string" || !(await findOwnedStoreById(storeId, owner.id))) {
    return response.status(404).json({ error: "Nie znaleziono sklepu." });
  }
  if (!isRecord(request.body)) {
    return response.status(400).json({ error: "Nieprawidłowe dane produktu." });
  }

  try {
    const id = await createProductForStore(storeId, owner.id, request.body);
    return response.status(201).json({ product: { id } });
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError) {
      return response.status(400).json({ error: error.message });
    }
    console.error("Shop product creation failed:", error instanceof Error ? error.name : "UnknownError");
    return response.status(503).json({ error: "Nie udało się utworzyć produktu." });
  }
}

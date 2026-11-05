import type { NextApiRequest, NextApiResponse } from "next";
import {
  deleteProductForStore,
  updateProductForStore,
} from "../../../../../server/shop-catalog";
import { getShopOwner } from "../../../../../server/shop-auth";
import { hasSameOrigin, isRecord } from "../../../../../server/shop-request";
import { findOwnedStoreById } from "../../../../../server/store-repository";

export default async function productHandler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (!["PATCH", "DELETE"].includes(request.method ?? "")) {
    response.setHeader("Allow", "PATCH, DELETE");
    return response.status(405).json({ error: "Metoda niedozwolona." });
  }
  if (!hasSameOrigin(request)) {
    return response.status(403).json({ error: "Nieprawidłowe źródło żądania." });
  }
  const owner = await getShopOwner(request);
  if (!owner) {
    return response.status(401).json({ error: "Wymagane jest zalogowanie." });
  }
  const { id: storeId, productId } = request.query;
  if (
    typeof storeId !== "string" ||
    typeof productId !== "string" ||
    !(await findOwnedStoreById(storeId, owner.id))
  ) {
    return response.status(404).json({ error: "Nie znaleziono sklepu lub produktu." });
  }

  try {
    const changed =
      request.method === "DELETE"
        ? await deleteProductForStore(storeId, productId)
        : isRecord(request.body)
          ? await updateProductForStore(storeId, productId, request.body)
          : false;
    if (!changed) {
      return response.status(404).json({ error: "Nie znaleziono produktu." });
    }
    return response.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError) {
      return response.status(400).json({ error: error.message });
    }
    console.error("Shop product update failed:", error instanceof Error ? error.name : "UnknownError");
    return response.status(503).json({ error: "Nie udało się zapisać produktu." });
  }
}

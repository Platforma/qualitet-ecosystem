import type { NextApiRequest, NextApiResponse } from "next";
import {
  updateOwnedStoreStatus,
  updateOwnedStoreDesign,
  updateOwnedStoreSettings,
} from "../../../server/store-repository";
import { getShopOwner } from "../../../server/shop-auth";
import { hasSameOrigin, isRecord } from "../../../server/shop-request";
import { normalizeStoreSettings } from "../../../models/store";

export default async function storeHandler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (request.method !== "PATCH") {
    response.setHeader("Allow", "PATCH");
    return response.status(405).json({ error: "Metoda niedozwolona." });
  }
  if (!hasSameOrigin(request)) {
    return response.status(403).json({ error: "Nieprawidłowe źródło żądania." });
  }

  const owner = await getShopOwner(request);
  if (!owner) {
    return response.status(401).json({ error: "Wymagane jest zalogowanie." });
  }
  const id = request.query.id;
  if (typeof id !== "string") {
    return response.status(400).json({ error: "Nieprawidłowy identyfikator sklepu." });
  }

  const body: unknown = request.body;
  if (!isRecord(body) || typeof body.section !== "string") {
    return response.status(400).json({ error: "Nieprawidłowa sekcja ustawień." });
  }

  try {
    let updated;
    if (body.section === "settings") {
      if (typeof body.name !== "string") {
        return response.status(400).json({ error: "Podaj nazwę sklepu." });
      }
      updated = await updateOwnedStoreSettings(id, owner.id, {
        name: body.name,
        settings: normalizeStoreSettings(body.settings),
      });
    } else if (body.section === "design") {
      updated = await updateOwnedStoreDesign(id, owner.id, body.design);
    } else if (
      body.section === "status" &&
      (body.status === "draft" || body.status === "active")
    ) {
      updated = await updateOwnedStoreStatus(id, owner.id, body.status);
    } else {
      return response.status(400).json({ error: "Nieznana sekcja ustawień." });
    }

    if (!updated) {
      return response.status(404).json({ error: "Nie znaleziono sklepu." });
    }
    return response.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError) {
      return response.status(400).json({ error: error.message });
    }
    console.error(
      "Shop store update failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return response.status(503).json({ error: "Nie udało się zapisać sklepu." });
  }
}

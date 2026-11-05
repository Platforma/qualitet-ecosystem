import type { NextApiRequest, NextApiResponse } from "next";
import { normalizeCreateShopCategoryInput } from "../../../../models/category";
import {
  createCategoryForStore,
  deleteCategoryForStore,
  updateCategoryForStore,
} from "../../../../server/shop-catalog";
import { getShopOwner } from "../../../../server/shop-auth";
import { findOwnedStoreById } from "../../../../server/store-repository";
import { hasSameOrigin, isRecord } from "../../../../server/shop-request";

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export default async function categoriesHandler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (!["POST", "PUT", "DELETE"].includes(request.method ?? "")) {
    response.setHeader("Allow", "POST, PUT, DELETE");
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
  if (
    typeof storeId !== "string" ||
    !(await findOwnedStoreById(storeId, owner.id))
  ) {
    return response.status(404).json({ error: "Nie znaleziono sklepu." });
  }

  const body: unknown = request.body;
  if (request.method === "DELETE") {
    const categoryId = request.query.categoryId;
    if (typeof categoryId !== "string") {
      return response.status(400).json({ error: "Nieprawidłowy identyfikator kategorii." });
    }
    try {
      const deleted = await deleteCategoryForStore(categoryId, storeId, owner.id);
      return deleted
        ? response.status(200).json({ success: true })
        : response.status(404).json({ error: "Nie znaleziono kategorii." });
    } catch (error) {
      console.error("Shop category deletion failed:", error instanceof Error ? error.name : "UnknownError");
      return response.status(503).json({ error: "Nie udało się usunąć kategorii." });
    }
  }

  if (
    !isRecord(body) ||
    typeof body.name !== "string" ||
    typeof body.slug !== "string" ||
    (body.description !== undefined && typeof body.description !== "string")
  ) {
    return response.status(400).json({ error: "Nieprawidłowe dane kategorii." });
  }

  try {
    const input = normalizeCreateShopCategoryInput({
      storeId,
      ownerUserId: owner.id,
      name: body.name,
      slug: body.slug,
      ...(typeof body.description === "string"
        ? { description: body.description }
        : {}),
    });
    if (request.method === "PUT") {
      const categoryId = body.categoryId;
      if (typeof categoryId !== "string") {
        return response.status(400).json({ error: "Nieprawidłowy identyfikator kategorii." });
      }
      const updated = await updateCategoryForStore(categoryId, storeId, owner.id, {
        name: input.name,
        slug: input.slug,
        ...(input.description === undefined ? {} : { description: input.description }),
      });
      return updated
        ? response.status(200).json({ success: true })
        : response.status(404).json({ error: "Nie znaleziono kategorii." });
    }
    const category = await createCategoryForStore(input);
    return response.status(201).json({ category: { id: String(category._id) } });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return response.status(409).json({
        error: "Kategoria o takim slug już istnieje w tym sklepie.",
      });
    }
    if (error instanceof TypeError || error instanceof RangeError) {
      return response.status(400).json({ error: error.message });
    }
    console.error(
      "Shop category creation failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return response.status(503).json({ error: "Nie udało się utworzyć kategorii." });
  }
}

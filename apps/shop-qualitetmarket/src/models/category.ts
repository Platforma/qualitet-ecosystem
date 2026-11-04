import type { Document, ObjectId } from "mongodb";

export interface ShopCategory extends Document {
  _id?: ObjectId;
  storeId: string;
  ownerUserId: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShopCategoryInput {
  storeId: string;
  ownerUserId: string;
  name: string;
  slug: string;
  description?: string;
}

function requiredText(value: unknown, field: string, maximumLength: number) {
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be a string.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximumLength) {
    throw new RangeError(`${field} must contain 1-${maximumLength} characters.`);
  }

  return normalized;
}

export function normalizeCreateShopCategoryInput(
  input: CreateShopCategoryInput,
): CreateShopCategoryInput {
  if (typeof input !== "object" || input === null) {
    throw new TypeError("Category input must be an object.");
  }

  const storeId = requiredText(input.storeId, "storeId", 24);
  const ownerUserId = requiredText(input.ownerUserId, "ownerUserId", 128);
  const name = requiredText(input.name, "name", 120);
  const slug = requiredText(input.slug, "slug", 100).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    throw new TypeError("slug must contain lowercase letters, numbers, or hyphens.");
  }

  const description =
    input.description === undefined
      ? undefined
      : requiredText(input.description, "description", 2_000);

  return {
    storeId,
    ownerUserId,
    name,
    slug,
    ...(description ? { description } : {}),
  };
}

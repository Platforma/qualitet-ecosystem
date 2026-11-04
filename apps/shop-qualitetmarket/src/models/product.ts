export const shopProductStatuses = ["draft", "active", "archived"] as const;
export type ShopProductStatus = (typeof shopProductStatuses)[number];

export interface ShopProductInput {
  name: string;
  sku: string;
  description: string;
  price: number;
  currency: string;
  status: ShopProductStatus;
}

export function normalizeShopProductInput(value: unknown): ShopProductInput {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Product input must be an object.");
  }
  const input = value as Record<string, unknown>;
  if (typeof input.name !== "string") {
    throw new TypeError("Product name must be a string.");
  }
  const name = input.name.trim();
  if (!name || name.length > 200) {
    throw new RangeError("Product name must contain 1-200 characters.");
  }
  const sku = input.sku === undefined ? "" : input.sku;
  if (typeof sku !== "string" || sku.trim().length > 100) {
    throw new RangeError("Product SKU must contain at most 100 characters.");
  }
  const description = input.description === undefined ? "" : input.description;
  if (typeof description !== "string" || description.trim().length > 5_000) {
    throw new RangeError("Product description must contain at most 5000 characters.");
  }
  if (typeof input.price !== "number" || !Number.isFinite(input.price) || input.price < 0) {
    throw new TypeError("Product price must be a non-negative number.");
  }
  if (typeof input.currency !== "string" || !/^[A-Za-z]{3}$/.test(input.currency)) {
    throw new TypeError("Product currency must be a three-letter ISO currency code.");
  }
  const status =
    input.status === undefined ? "draft" : input.status;
  if (
    typeof status !== "string" ||
    !shopProductStatuses.includes(status as ShopProductStatus)
  ) {
    throw new TypeError("Product status must be draft, active, or archived.");
  }

  return {
    name,
    sku: sku.trim(),
    description: description.trim(),
    price: Math.round(input.price * 100) / 100,
    currency: input.currency.toUpperCase(),
    status: status as ShopProductStatus,
  };
}

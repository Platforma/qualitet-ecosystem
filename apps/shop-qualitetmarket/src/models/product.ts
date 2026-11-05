export const shopProductStatuses = ["draft", "active", "archived"] as const;
export type ShopProductStatus = (typeof shopProductStatuses)[number];

export interface ShopProductVariant {
  sku: string;
  attributes: Record<string, string>;
  price?: number;
  inventoryQuantity: number;
}

export interface ShopProductInput {
  kind: "product" | "service";
  name: string;
  sku: string;
  ean: string;
  brand: string;
  description: string;
  price: number;
  currency: string;
  status: ShopProductStatus;
  inventoryQuantity: number;
  trackInventory: boolean;
  images: string[];
  attributes: Record<string, string>;
  variants: ShopProductVariant[];
  seoTitle: string;
  seoDescription: string;
}

function normalizeAttributes(value: unknown, field: string) {
  if (value === undefined) {
    return {};
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object.`);
  }
  const entries = Object.entries(value);
  if (entries.length > 50) {
    throw new RangeError(`${field} must contain no more than 50 attributes.`);
  }
  return Object.fromEntries(
    entries.map(([key, attribute]) => {
      const normalizedKey = key.trim();
      if (!normalizedKey || normalizedKey.length > 80 || typeof attribute !== "string" || attribute.trim().length > 500) {
        throw new TypeError(`${field} contains an invalid key or value.`);
      }
      return [normalizedKey, attribute.trim()];
    }),
  );
}

function normalizeCount(value: unknown, field: string) {
  const count = value === undefined ? 0 : value;
  if (
    typeof count !== "number" ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > 1_000_000_000
  ) {
    throw new TypeError(`${field} must be a non-negative whole number.`);
  }
  return count;
}

export function normalizeShopProductInput(value: unknown): ShopProductInput {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Product input must be an object.");
  }
  const input = value as Record<string, unknown>;
  const kind = input.kind === undefined ? "product" : input.kind;
  if (kind !== "product" && kind !== "service") {
    throw new TypeError("Product kind must be product or service.");
  }
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
  const ean = input.ean === undefined ? "" : input.ean;
  if (
    typeof ean !== "string" ||
    (ean !== "" && !/^(?:\d{8}|\d{12,14})$/.test(ean.trim()))
  ) {
    throw new TypeError("EAN must contain 8, 12, 13, or 14 digits.");
  }
  const brand = input.brand === undefined ? "" : input.brand;
  if (typeof brand !== "string" || brand.trim().length > 120) {
    throw new RangeError("Brand must contain at most 120 characters.");
  }
  const inventoryQuantity = normalizeCount(input.inventoryQuantity, "inventoryQuantity");
  const trackInventory =
    input.trackInventory === undefined ? kind === "product" : input.trackInventory;
  if (typeof trackInventory !== "boolean") {
    throw new TypeError("trackInventory must be a boolean.");
  }
  const imagesValue = input.images === undefined ? [] : input.images;
  if (!Array.isArray(imagesValue) || imagesValue.length > 10) {
    throw new RangeError("A product can have up to 10 image URLs.");
  }
  const images = imagesValue.map((image, index) => {
    if (typeof image !== "string" || image.trim().length > 2_000) {
      throw new TypeError(`images[${index}] must be an HTTP(S) URL.`);
    }
    try {
      const url = new URL(image.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      throw new TypeError(`images[${index}] must be an HTTP(S) URL.`);
    }
    return image.trim();
  });
  const variantsValue = input.variants === undefined ? [] : input.variants;
  if (!Array.isArray(variantsValue) || variantsValue.length > 100) {
    throw new RangeError("A product can have up to 100 variants.");
  }
  const variants = variantsValue.map((variant, index) => {
    if (typeof variant !== "object" || variant === null || Array.isArray(variant)) {
      throw new TypeError(`variants[${index}] must be an object.`);
    }
    const item = variant as Record<string, unknown>;
    const skuValue = item.sku === undefined ? "" : item.sku;
    if (typeof skuValue !== "string" || skuValue.trim().length > 100) {
      throw new TypeError(`variants[${index}].sku is invalid.`);
    }
    const variantPrice = item.price;
    if (
      variantPrice !== undefined &&
      (typeof variantPrice !== "number" ||
        !Number.isFinite(variantPrice) ||
        variantPrice < 0)
    ) {
      throw new TypeError(`variants[${index}].price must be non-negative.`);
    }
    return {
      sku: skuValue.trim(),
      attributes: normalizeAttributes(item.attributes, `variants[${index}].attributes`),
      ...(typeof variantPrice === "number"
        ? { price: Math.round(variantPrice * 100) / 100 }
        : {}),
      inventoryQuantity: normalizeCount(
        item.inventoryQuantity,
        `variants[${index}].inventoryQuantity`,
      ),
    };
  });
  const seoTitle = input.seoTitle === undefined ? "" : input.seoTitle;
  const seoDescription = input.seoDescription === undefined ? "" : input.seoDescription;
  if (typeof seoTitle !== "string" || seoTitle.trim().length > 70) {
    throw new RangeError("SEO title must contain at most 70 characters.");
  }
  if (typeof seoDescription !== "string" || seoDescription.trim().length > 170) {
    throw new RangeError("SEO description must contain at most 170 characters.");
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
    kind,
    name,
    sku: sku.trim(),
    ean: ean.trim(),
    brand: brand.trim(),
    description: description.trim(),
    price: Math.round(input.price * 100) / 100,
    currency: input.currency.toUpperCase(),
    status: status as ShopProductStatus,
    inventoryQuantity,
    trackInventory,
    images,
    attributes: normalizeAttributes(input.attributes, "attributes"),
    variants,
    seoTitle: seoTitle.trim(),
    seoDescription: seoDescription.trim(),
  };
}

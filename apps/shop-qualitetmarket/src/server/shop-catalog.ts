import { ObjectId, type Document, type OptionalUnlessRequiredId } from "mongodb";
import {
  normalizeCreateShopCategoryInput,
  type CreateShopCategoryInput,
  type ShopCategory,
} from "../models/category";
import {
  normalizeShopProductInput,
  type ShopProductInput,
} from "../models/product";
import { getShopDatabase } from "./mongodb";

export interface ShopCategoryListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
}

export interface ShopProductListItem {
  id: string;
  name: string;
  sku: string | null;
  description: string;
  status: string;
  price: number | null;
  currency: string | null;
  updatedAt: string | null;
}

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

function dateString(value: unknown) {
  return value instanceof Date && Number.isFinite(value.getTime())
    ? value.toISOString()
    : null;
}

export async function listProductsForStore(
  storeId: string,
): Promise<ShopProductListItem[]> {
  const collection = (await getShopDatabase()).collection<Document>("products");
  const products = await collection
    .find({ storeId })
    .project({
      name: 1,
      sku: 1,
      description: 1,
      status: 1,
      price: 1,
      currency: 1,
      updatedAt: 1,
      createdAt: 1,
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(500)
    .toArray();

  return products.map((product) => ({
    id: String(product._id),
    name: text(product.name) ?? "—",
    sku: text(product.sku),
    description: text(product.description) ?? "",
    status: text(product.status) ?? "unknown",
    price:
      typeof product.price === "number" && Number.isFinite(product.price)
        ? product.price
        : null,
    currency: text(product.currency),
    updatedAt: dateString(product.updatedAt) ?? dateString(product.createdAt),
  }));
}

export async function createProductForStore(
  storeId: string,
  ownerUserId: string,
  input: unknown,
): Promise<string> {
  const product = normalizeShopProductInput(input);
  const now = new Date();
  const collection = (await getShopDatabase()).collection<Document>("products");
  const result = await collection.insertOne({
    ...product,
    storeId,
    ownerUserId,
    createdAt: now,
    updatedAt: now,
  });
  return String(result.insertedId);
}

export async function updateProductForStore(
  storeId: string,
  productId: string,
  input: unknown,
): Promise<boolean> {
  if (!ObjectId.isValid(productId)) {
    return false;
  }
  const product: ShopProductInput = normalizeShopProductInput(input);
  const result = await (await getShopDatabase())
    .collection<Document>("products")
    .updateOne(
      { _id: new ObjectId(productId), storeId },
      { $set: { ...product, updatedAt: new Date() } },
    );
  return result.matchedCount > 0;
}

export async function deleteProductForStore(
  storeId: string,
  productId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(productId)) {
    return false;
  }
  const result = await (await getShopDatabase())
    .collection<Document>("products")
    .deleteOne({ _id: new ObjectId(productId), storeId });
  return result.deletedCount > 0;
}

export async function countProductsForStores(storeIds: string[]) {
  if (storeIds.length === 0) {
    return new Map<string, number>();
  }

  const collection = (await getShopDatabase()).collection<Document>("products");
  const counts = await collection
    .aggregate<{ _id: string; count: number }>([
      { $match: { storeId: { $in: storeIds } } },
      { $group: { _id: "$storeId", count: { $sum: 1 } } },
    ])
    .toArray();
  return new Map(counts.map(({ _id, count }) => [_id, count]));
}

export async function countCatalogForStore(storeId: string) {
  const db = await getShopDatabase();
  const [products, categories, customers, orders] = await Promise.all([
    db.collection("products").countDocuments({ storeId }),
    db.collection("shop_categories").countDocuments({ storeId }),
    db.collection("customers").countDocuments({ storeId }),
    db.collection("orders").countDocuments({ storeId }),
  ]);
  return { products, categories, customers, orders };
}

async function getCategoriesCollection() {
  const collection =
    (await getShopDatabase()).collection<ShopCategory>("shop_categories");
  await Promise.all([
    collection.createIndex({ storeId: 1, slug: 1 }, { unique: true }),
    collection.createIndex({ ownerUserId: 1, storeId: 1, createdAt: -1 }),
  ]);
  return collection;
}

export async function listCategoriesForStore(
  storeId: string,
): Promise<ShopCategoryListItem[]> {
  const categories = await (await getCategoriesCollection())
    .find({ storeId })
    .project({
      name: 1,
      slug: 1,
      description: 1,
      createdAt: 1,
    })
    .sort({ name: 1 })
    .limit(500)
    .toArray();

  return categories.map((category) => ({
    id: String(category._id),
    name: typeof category.name === "string" ? category.name : "—",
    slug: typeof category.slug === "string" ? category.slug : "—",
    description: category.description ?? null,
    createdAt:
      category.createdAt instanceof Date &&
      Number.isFinite(category.createdAt.getTime())
        ? category.createdAt.toISOString()
        : "—",
  }));
}

export async function createCategoryForStore(
  input: CreateShopCategoryInput,
): Promise<ShopCategory> {
  const normalized = normalizeCreateShopCategoryInput(input);
  const now = new Date();
  const category: OptionalUnlessRequiredId<ShopCategory> = {
    ...normalized,
    createdAt: now,
    updatedAt: now,
  };
  const collection = await getCategoriesCollection();
  const result = await collection.insertOne(category);
  return { ...category, _id: result.insertedId };
}

export async function updateCategoryForStore(
  id: string,
  storeId: string,
  ownerUserId: string,
  input: Pick<CreateShopCategoryInput, "name" | "slug" | "description">,
): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }
  const normalized = normalizeCreateShopCategoryInput({
    storeId,
    ownerUserId,
    ...input,
  });
  const result = await (await getCategoriesCollection()).updateOne(
    { _id: new ObjectId(id), storeId, ownerUserId },
    {
      $set: {
        name: normalized.name,
        slug: normalized.slug,
        ...(normalized.description ? { description: normalized.description } : { description: "" }),
        updatedAt: new Date(),
      },
    },
  );
  return result.matchedCount > 0;
}

export async function deleteCategoryForStore(
  id: string,
  storeId: string,
  ownerUserId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }
  const result = await (await getCategoriesCollection()).deleteOne({
    _id: new ObjectId(id),
    storeId,
    ownerUserId,
  });
  return result.deletedCount > 0;
}

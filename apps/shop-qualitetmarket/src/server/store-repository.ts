import {
  ObjectId,
  type Collection,
  type OptionalUnlessRequiredId,
} from "mongodb";
import {
  normalizeCreateStoreInput,
  normalizeStoreDesign,
  normalizeStoreName,
  normalizeStoreSettings,
  type CreateStoreInput,
  type Store,
  type StoreDesign,
  type StoreSettings,
} from "../models/store";
import { getShopDatabase } from "./mongodb";

let storeIndexesPromise: Promise<void> | undefined;

async function getStoresCollection(): Promise<Collection<Store>> {
  const collection = (await getShopDatabase()).collection<Store>("stores");
  storeIndexesPromise ??= Promise.all([
    collection.createIndex({ ownerUserId: 1, createdAt: -1 }),
    collection.createIndex({ ownerUserId: 1, slug: 1 }),
    collection.createIndex({ slug: 1 }, { unique: true }),
    collection.createIndex({ domain: 1 }),
  ])
    .then(() => undefined)
    .catch((error: unknown) => {
      storeIndexesPromise = undefined;
      throw error;
    });
  await storeIndexesPromise;
  return collection;
}

export async function createStore(input: CreateStoreInput): Promise<Store> {
  const normalized = normalizeCreateStoreInput(input);
  const now = new Date();
  const store: OptionalUnlessRequiredId<Store> = {
    ...normalized,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  const collection = await getStoresCollection();
  const result = await collection.insertOne(store);

  return { ...store, _id: result.insertedId };
}

export async function findStoreById(id: string): Promise<Store | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return (await getStoresCollection()).findOne({ _id: new ObjectId(id) });
}

export async function findOwnedStoreById(
  id: string,
  ownerUserId: string,
): Promise<Store | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return (await getStoresCollection()).findOne({
    _id: new ObjectId(id),
    ownerUserId: ownerUserId.trim(),
  });
}

export async function findStoreBySlug(slug: string): Promise<Store | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  return (await getStoresCollection()).findOne({ slug: normalizedSlug });
}

export async function listStoresForOwner(
  ownerUserId: string,
  limit = 100,
): Promise<Store[]> {
  const normalizedOwnerId = ownerUserId.trim();
  if (!normalizedOwnerId) {
    throw new TypeError("ownerUserId must not be empty.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new RangeError("limit must be an integer between 1 and 500.");
  }

  return (await getStoresCollection())
    .find({ ownerUserId: normalizedOwnerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function updateOwnedStoreSettings(
  id: string,
  ownerUserId: string,
  input: { name: unknown; settings: unknown },
): Promise<Store | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const name = normalizeStoreName(input.name);
  const settings: StoreSettings = normalizeStoreSettings(input.settings);
  const collection = await getStoresCollection();
  const result = await collection.updateOne(
    { _id: new ObjectId(id), ownerUserId: ownerUserId.trim() },
    { $set: { name, settings, updatedAt: new Date() } },
  );
  if (result.matchedCount === 0) {
    return null;
  }

  return collection.findOne({ _id: new ObjectId(id) });
}

export async function updateOwnedStoreDesign(
  id: string,
  ownerUserId: string,
  input: unknown,
): Promise<Store | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const design: StoreDesign = normalizeStoreDesign(input);
  const collection = await getStoresCollection();
  const result = await collection.updateOne(
    { _id: new ObjectId(id), ownerUserId: ownerUserId.trim() },
    { $set: { design, updatedAt: new Date() } },
  );
  if (result.matchedCount === 0) {
    return null;
  }

  return collection.findOne({ _id: new ObjectId(id) });
}

export async function updateOwnedStoreStatus(
  id: string,
  ownerUserId: string,
  status: "draft" | "active",
): Promise<Store | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const collection = await getStoresCollection();
  const result = await collection.updateOne(
    { _id: new ObjectId(id), ownerUserId: ownerUserId.trim() },
    { $set: { status, updatedAt: new Date() } },
  );
  if (result.matchedCount === 0) {
    return null;
  }
  return collection.findOne({ _id: new ObjectId(id) });
}

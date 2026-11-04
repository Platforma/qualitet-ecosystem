const memorySchema = require("./memory.schema.json");

const retentionSections = new Set(["tasks", "history", "logs"]);
const retentionDays = 90;

function validateRecord(section, record) {
  const definition = memorySchema.sections[section];
  if (!definition) {
    return { valid: false, error: "Unknown memory section." };
  }

  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return { valid: false, error: "Record must be an object." };
  }

  const { key, data, tags = [] } = record;
  if (
    typeof key !== "string" ||
    !new RegExp(memorySchema.record.keyPattern).test(key)
  ) {
    return { valid: false, error: "Record key has an invalid format." };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, error: "Record data must be an object." };
  }

  if (
    Buffer.byteLength(JSON.stringify(data), "utf8") >
    memorySchema.record.maxDataBytes
  ) {
    return { valid: false, error: "Record data exceeds the size limit." };
  }

  if (
    !Array.isArray(tags) ||
    tags.length > memorySchema.record.maxTags ||
    tags.some((tag) => typeof tag !== "string" || tag.length > 64)
  ) {
    return { valid: false, error: "Record tags are invalid." };
  }

  const missing = definition.requiredDataFields.filter(
    (field) => !(field in data) || data[field] === null || data[field] === "",
  );
  if (missing.length) {
    return {
      valid: false,
      error: `Missing required data fields: ${missing.join(", ")}.`,
    };
  }

  return { valid: true };
}

function createMemoryEngine({ getCollection, ownerId }) {
  if (typeof getCollection !== "function") {
    throw new TypeError("getCollection must be a function.");
  }
  if (typeof ownerId !== "string" || !ownerId.trim()) {
    throw new TypeError("A non-empty ownerId is required.");
  }

  async function ensureIndexes() {
    for (const section of Object.keys(memorySchema.sections)) {
      const collection = await getCollection(section);
      await collection.createIndex(
        { ownerId: 1, key: 1 },
        { unique: true, name: "ownerId_key_unique" },
      );
      await collection.createIndex(
        { ownerId: 1, archivedAt: 1, updatedAt: -1 },
        { name: "ownerId_updatedAt" },
      );
      if (retentionSections.has(section)) {
        await collection.createIndex(
          { expiresAt: 1 },
          { expireAfterSeconds: 0, name: "expiresAt_ttl" },
        );
      }
    }
  }

  async function create(section, input) {
    const validation = validateRecord(section, input);
    if (!validation.valid) {
      const error = new TypeError(validation.error);
      error.code = "INVALID_MEMORY_RECORD";
      throw error;
    }

    const now = new Date();
    const document = {
      ownerId,
      key: input.key,
      data: input.data,
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
    };
    if (retentionSections.has(section)) {
      document.expiresAt = new Date(
        now.getTime() + retentionDays * 24 * 60 * 60 * 1000,
      );
    }

    const result = await (await getCollection(section)).insertOne(document);
    return { ...document, _id: result.insertedId };
  }

  async function read(section, key) {
    if (!memorySchema.sections[section]) {
      throw new TypeError("Unknown memory section.");
    }
    return (await getCollection(section)).findOne({
      ownerId,
      key,
      archivedAt: { $exists: false },
    });
  }

  async function update(section, key, data, tags) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      const error = new TypeError("Update data must be an object.");
      error.code = "INVALID_MEMORY_RECORD";
      throw error;
    }
    const collection = await getCollection(section);
    const current = await collection.findOne({
      ownerId,
      key,
      archivedAt: { $exists: false },
    });
    if (!current) return null;

    const next = {
      key,
      data: { ...current.data, ...data },
      tags: tags === undefined ? current.tags : tags,
    };
    const validation = validateRecord(section, next);
    if (!validation.valid) {
      const error = new TypeError(validation.error);
      error.code = "INVALID_MEMORY_RECORD";
      throw error;
    }

    const updatedAt = new Date();
    await collection.updateOne(
      { _id: current._id, ownerId, archivedAt: { $exists: false } },
      { $set: { data: next.data, tags: next.tags, updatedAt } },
    );
    return { ...current, data: next.data, tags: next.tags, updatedAt };
  }

  async function archive(section, key) {
    if (!memorySchema.sections[section]) {
      throw new TypeError("Unknown memory section.");
    }
    const now = new Date();
    const result = await (await getCollection(section)).updateOne(
      { ownerId, key, archivedAt: { $exists: false } },
      { $set: { archivedAt: now, updatedAt: now } },
    );
    return result.modifiedCount === 1;
  }

  async function search(section, { query = "", limit = 50 } = {}) {
    if (!memorySchema.sections[section]) {
      throw new TypeError("Unknown memory section.");
    }
    const safeLimit = Math.min(
      Math.max(Number.parseInt(limit, 10) || 50, 1),
      200,
    );
    const documents = await (await getCollection(section))
      .find({ ownerId, archivedAt: { $exists: false } })
      .sort({ updatedAt: -1 })
      .limit(query ? 500 : safeLimit)
      .toArray();
    const normalizedQuery = String(query).slice(0, 256).trim().toLocaleLowerCase();
    const matches = normalizedQuery
      ? documents.filter((document) =>
          `${document.key} ${document.tags.join(" ")} ${JSON.stringify(document.data)}`
            .toLocaleLowerCase()
            .includes(normalizedQuery),
        )
      : documents;
    return matches.slice(0, safeLimit);
  }

  return { archive, create, ensureIndexes, read, search, update };
}

module.exports = { createMemoryEngine, validateRecord };

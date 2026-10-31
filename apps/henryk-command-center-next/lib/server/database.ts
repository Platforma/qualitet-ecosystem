import { MongoClient, type Collection, type Db, type Document } from "mongodb";
import aiStatusData from "../../../../data/ai-status.json";

const collectionValidators: Record<string, Document> = {
  users: {
    bsonType: "object",
    required: ["email", "name", "role", "passwordHash", "status", "createdAt"],
    properties: {
      email: { bsonType: "string" },
      name: { bsonType: "string" },
      role: { enum: ["owner", "admin", "user"] },
      passwordHash: { bsonType: "string" },
      status: { enum: ["active", "disabled"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      lastLoginAt: { bsonType: "date" },
    },
  },
  ai_agents: {
    bsonType: "object",
    required: ["agentId", "name", "status", "createdAt"],
    properties: {
      agentId: { bsonType: "string" },
      name: { bsonType: "string" },
      status: { enum: ["ready", "running", "stopped", "error"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  ai_tasks: {
    bsonType: "object",
    required: ["taskId", "agentId", "status", "createdAt"],
    properties: {
      taskId: { bsonType: "string" },
      agentId: { bsonType: "string" },
      status: { enum: ["queued", "running", "completed", "failed", "cancelled"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  memory_entries: {
    bsonType: "object",
    required: ["key", "type", "content", "createdAt"],
    properties: {
      key: { bsonType: "string" },
      type: { bsonType: "string" },
      content: { bsonType: "string" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  integrations: {
    bsonType: "object",
    required: ["provider", "status", "createdAt"],
    properties: {
      provider: { bsonType: "string" },
      status: { enum: ["connected", "unavailable", "unconfigured"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  audit_logs: {
    bsonType: "object",
    required: ["actorId", "action", "createdAt"],
    properties: {
      actorId: { bsonType: "string" },
      action: { bsonType: "string" },
      createdAt: { bsonType: "date" },
    },
  },
  system_health: {
    bsonType: "object",
    required: ["status", "checkedAt"],
    properties: {
      status: { enum: ["healthy", "degraded", "unavailable"] },
      checkedAt: { bsonType: "date" },
    },
  },
  companies: {
    bsonType: "object",
    required: ["name", "createdAt"],
    properties: { name: { bsonType: "string" }, createdAt: { bsonType: "date" } },
  },
  crm_contacts: {
    bsonType: "object",
    required: ["name", "createdAt"],
    properties: { name: { bsonType: "string" }, createdAt: { bsonType: "date" } },
  },
  leads: {
    bsonType: "object",
    required: ["name", "status", "createdAt"],
    properties: {
      name: { bsonType: "string" },
      status: { bsonType: "string" },
      createdAt: { bsonType: "date" },
    },
  },
  products: {
    bsonType: "object",
    required: ["name", "status", "createdAt"],
    properties: {
      name: { bsonType: "string" },
      status: { bsonType: "string" },
      createdAt: { bsonType: "date" },
    },
  },
  stores: {
    bsonType: "object",
    required: ["name", "status", "createdAt"],
    properties: {
      name: { bsonType: "string" },
      status: { bsonType: "string" },
      createdAt: { bsonType: "date" },
    },
  },
  marketplace_ads: {
    bsonType: "object",
    required: ["title", "marketplace", "status", "createdAt"],
    properties: {
      title: { bsonType: "string" },
      marketplace: { bsonType: "string" },
      status: { bsonType: "string" },
      createdAt: { bsonType: "date" },
    },
  },
};

const indexDefinitions: Record<
  string,
  { keys: Document; options?: { unique?: boolean; expireAfterSeconds?: number } }[]
> = {
  users: [{ keys: { email: 1 }, options: { unique: true } }],
  auth_sessions: [
    { keys: { sessionId: 1 }, options: { unique: true } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
    { keys: { userId: 1, revokedAt: 1 } },
  ],
  auth_attempts: [
    { keys: { key: 1 }, options: { unique: true } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  ai_agents: [{ keys: { agentId: 1 }, options: { unique: true } }],
  ai_tasks: [{ keys: { taskId: 1 }, options: { unique: true } }, { keys: { status: 1, createdAt: -1 } }],
  memory_entries: [{ keys: { key: 1 }, options: { unique: true } }, { keys: { type: 1, updatedAt: -1 } }],
  integrations: [{ keys: { provider: 1 }, options: { unique: true } }],
  audit_logs: [{ keys: { createdAt: -1 } }, { keys: { actorId: 1, createdAt: -1 } }],
  system_health: [{ keys: { checkedAt: -1 } }],
  companies: [{ keys: { name: 1 } }],
  crm_contacts: [{ keys: { email: 1 } }, { keys: { companyId: 1 } }],
  leads: [{ keys: { status: 1, createdAt: -1 } }],
  products: [{ keys: { name: 1 } }, { keys: { status: 1 } }],
  stores: [{ keys: { name: 1 } }],
  marketplace_ads: [{ keys: { marketplace: 1, status: 1 } }],
};

type MongoGlobals = typeof globalThis & {
  __qualitetMongoClient?: MongoClient;
  __qualitetMongoDatabasePromise?: Promise<Db>;
  __qualitetMongoIndexesPromise?: Promise<void>;
};

const mongoGlobals = globalThis as MongoGlobals;

function getMongoUri() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MongoDB nie jest skonfigurowane.");
  }
  return uri;
}

async function ensureCollection(database: Db, name: string) {
  const existing = await database
    .listCollections({ name }, { nameOnly: true })
    .hasNext();
  if (existing) {
    return;
  }

  try {
    const validator = collectionValidators[name];
    await database.createCollection(
      name,
      validator
        ? {
            validator: { $jsonSchema: validator },
            validationLevel: "moderate",
            validationAction: "error",
          }
        : undefined,
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 48
    ) {
      return;
    }
    throw error;
  }
}

async function ensureDatabaseFoundation(database: Db) {
  if (mongoGlobals.__qualitetMongoIndexesPromise) {
    return mongoGlobals.__qualitetMongoIndexesPromise;
  }

  mongoGlobals.__qualitetMongoIndexesPromise = (async () => {
    const names = new Set([
      ...Object.keys(collectionValidators),
      ...Object.keys(indexDefinitions),
    ]);

    for (const name of names) {
      await ensureCollection(database, name);
      const collection = database.collection(name);
      for (const index of indexDefinitions[name] ?? []) {
        await collection.createIndex(index.keys, index.options);
      }
    }

    const agents = database.collection("ai_agents");
    const now = new Date();
    await Promise.all(
      Object.entries(aiStatusData).map(([agentId, status]) =>
        agents.updateOne(
          { agentId },
          {
            $setOnInsert: {
              agentId,
              name: agentId,
              status: "ready",
              promptStatus: status.status,
              runtimeStatus: status.runtime,
              createdAt: now,
              updatedAt: now,
            },
          },
          { upsert: true },
        ),
      ),
    );

    const integrationEnvironments: Record<string, string> = {
      cloudflare: "CLOUDFLARE_API_TOKEN",
      mongodb: "MONGODB_URI",
      ollama: "OLLAMA_URL",
      render: "RENDER_API_KEY",
      github: "GITHUB_PAT",
      discord: "DISCORD_BOT_TOKEN",
      stripe: "STRIPE_SECRET_KEY",
      facebook: "FACEBOOK_ACCESS_TOKEN",
      allegro: "ALLEGRO_ACCESS_TOKEN",
      olx: "OLX_ACCESS_TOKEN",
    };
    const integrations = database.collection("integrations");
    await Promise.all(
      Object.entries(integrationEnvironments).map(([provider, envName]) =>
        integrations.updateOne(
          { provider },
          {
            $setOnInsert: {
              provider,
              status: process.env[envName]?.trim()
                ? "unavailable"
                : "unconfigured",
              verification: "not_checked",
              createdAt: now,
            },
          },
          { upsert: true },
        ),
      ),
    );
  })().catch((error: unknown) => {
    mongoGlobals.__qualitetMongoIndexesPromise = undefined;
    throw error;
  });

  return mongoGlobals.__qualitetMongoIndexesPromise;
}

export async function getDatabase(): Promise<Db> {
  if (!mongoGlobals.__qualitetMongoDatabasePromise) {
    const uri = getMongoUri();
    mongoGlobals.__qualitetMongoClient ??= new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5_000,
    });

    mongoGlobals.__qualitetMongoDatabasePromise =
      mongoGlobals.__qualitetMongoClient
        .connect()
        .then((client) => {
          const databaseName = process.env.MONGODB_DATABASE?.trim();
          return databaseName ? client.db(databaseName) : client.db();
        })
        .then(async (database) => {
          await ensureDatabaseFoundation(database);
          return database;
        })
        .catch((error: unknown) => {
          mongoGlobals.__qualitetMongoDatabasePromise = undefined;
          throw error;
        });
  }

  return mongoGlobals.__qualitetMongoDatabasePromise;
}

export async function connectToMongoDB(): Promise<MongoClient> {
  await getDatabase();
  const client = mongoGlobals.__qualitetMongoClient;
  if (!client) {
    throw new Error("Nie udało się utworzyć połączenia MongoDB.");
  }
  return client;
}

export async function disconnectFromMongoDB(): Promise<void> {
  const client = mongoGlobals.__qualitetMongoClient;
  if (!client) {
    return;
  }

  await client.close();
  mongoGlobals.__qualitetMongoClient = undefined;
  mongoGlobals.__qualitetMongoDatabasePromise = undefined;
  mongoGlobals.__qualitetMongoIndexesPromise = undefined;
}

export async function getCollection<T extends Document = Document>(
  name: string,
): Promise<Collection<T>> {
  return (await getDatabase()).collection<T>(name);
}

export async function writeAuditLog(input: {
  actorId: string;
  action: string;
  entity?: string;
  entityId?: string;
}) {
  const collection = await getCollection("audit_logs");
  await collection.insertOne({
    actorId: input.actorId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    createdAt: new Date(),
  });
}

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
      accountTypes: {
        bsonType: "array",
        items: {
          enum: [
            "customer",
            "company",
            "store",
            "wholesaler",
            "service_provider",
            "partner",
            "advertiser",
          ],
        },
      },
      passwordHash: { bsonType: "string" },
      status: { enum: ["active", "disabled"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      referredByPartnerId: { bsonType: "string" },
      lastLoginAt: { bsonType: "date" },
    },
  },
  roles: {
    bsonType: "object",
    required: ["key", "name", "permissions", "createdAt", "updatedAt"],
    properties: {
      key: { enum: ["owner", "admin", "user"] },
      name: { bsonType: "string" },
      permissions: { bsonType: "array", items: { bsonType: "string" } },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  permissions: {
    bsonType: "object",
    required: ["key", "resource", "action", "description", "createdAt", "updatedAt"],
    properties: {
      key: { bsonType: "string" },
      resource: { bsonType: "string" },
      action: { bsonType: "string" },
      description: { bsonType: "string" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
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
  ai_memory: {
    bsonType: "object",
    required: ["key", "ownerId", "type", "content", "createdAt", "updatedAt"],
    properties: {
      key: { bsonType: "string" },
      ownerId: { bsonType: "string" },
      type: { bsonType: "string" },
      content: { bsonType: "string" },
      tags: { bsonType: "array", items: { bsonType: "string" } },
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
  integration_configs: {
    bsonType: "object",
    required: ["provider", "values", "encryptedSecrets", "configuredFields", "updatedAt"],
    properties: {
      provider: { bsonType: "string" },
      values: { bsonType: "object" },
      encryptedSecrets: { bsonType: "object" },
      configuredFields: { bsonType: "array", items: { bsonType: "string" } },
      checkStatus: { enum: ["connected", "unavailable"] },
      checkMessage: { bsonType: "string" },
      checkedAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      updatedBy: { bsonType: "string" },
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
  notifications: {
    bsonType: "object",
    required: ["recipientId", "type", "title", "message", "createdAt"],
    properties: {
      recipientId: { bsonType: "string" },
      type: { bsonType: "string" },
      title: { bsonType: "string" },
      message: { bsonType: "string" },
      readAt: { bsonType: "date" },
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
  owner_settings: { bsonType: "object" },
  companies: {
    bsonType: "object",
    required: ["name", "createdAt"],
    properties: {
      name: { bsonType: "string" },
      slug: { bsonType: "string" },
      email: { bsonType: "string" },
      phone: { bsonType: "string" },
      website: { bsonType: "string" },
      country: { bsonType: "string" },
      ownerUserId: { bsonType: "string" },
      type: {
        enum: [
          "manufacturer",
          "wholesaler",
          "importer",
          "distributor",
          "brand",
          "seller",
          "service_provider",
        ],
      },
      status: { enum: ["pending", "active", "rejected", "suspended"] },
      categories: { bsonType: "array", items: { bsonType: "string" } },
      commissionDefault: { bsonType: ["double", "int", "long", "decimal"] },
      adBudget: { bsonType: ["double", "int", "long", "decimal"] },
      productsCount: { bsonType: ["int", "long"] },
      salesCount: { bsonType: ["int", "long"] },
      marketingConsent: { bsonType: "bool" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  suppliers: {
    bsonType: "object",
    required: ["companyId", "status", "createdAt", "updatedAt"],
    properties: {
      companyId: { bsonType: "string" },
      contactName: { bsonType: "string" },
      email: { bsonType: "string" },
      status: { enum: ["active", "pending", "suspended", "archived"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  partners: {
    bsonType: "object",
    required: ["status", "createdAt", "updatedAt"],
    properties: {
      companyId: { bsonType: "string" },
      userId: { bsonType: "string" },
      referralCode: { bsonType: "string", pattern: "^[a-f0-9]{12}$" },
      clickCount: { bsonType: ["int", "long"], minimum: 0 },
      lastClickAt: { bsonType: "date" },
      status: { enum: ["active", "pending", "suspended", "archived"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  advertisers: {
    bsonType: "object",
    required: ["status", "createdAt", "updatedAt"],
    properties: {
      companyId: { bsonType: "string" },
      userId: { bsonType: "string" },
      status: { enum: ["active", "pending", "suspended", "archived"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
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
      companyName: { bsonType: "string" },
      status: { enum: ["NEW", "CONTACTED", "OPENED", "CLICKED", "REGISTERED", "ACTIVE", "REJECTED"] },
      marketingConsent: { bsonType: "bool" },
      createdAt: { bsonType: "date" },
    },
  },
  outreach_campaigns: {
    bsonType: "object",
    required: ["name", "subject", "message", "status", "sent", "opened", "clicked", "registered", "createdAt"],
    properties: {
      name: { bsonType: "string" },
      subject: { bsonType: "string" },
      message: { bsonType: "string" },
      status: { enum: ["draft", "approved", "sending", "sent", "paused"] },
      sent: { bsonType: ["int", "long"] },
      opened: { bsonType: ["int", "long"] },
      clicked: { bsonType: ["int", "long"] },
      registered: { bsonType: ["int", "long"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  campaigns: {
    bsonType: "object",
    required: ["name", "advertiserId", "status", "createdAt", "updatedAt"],
    properties: {
      name: { bsonType: "string" },
      advertiserId: { bsonType: "string" },
      status: { enum: ["draft", "active", "paused", "completed"] },
      budget: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
      currency: { bsonType: "string", pattern: "^[A-Z]{3}$" },
      startsAt: { bsonType: "date" },
      endsAt: { bsonType: "date" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  products: {
    bsonType: "object",
    required: ["name", "status", "createdAt"],
    properties: {
      kind: { enum: ["product", "service", "listing"] },
      category: { bsonType: "string", maxLength: 80 },
      name: { bsonType: "string", minLength: 2, maxLength: 200 },
      description: { bsonType: "string", maxLength: 10_000 },
      sku: { bsonType: "string", minLength: 1, maxLength: 100 },
      imageUrl: { bsonType: "string", maxLength: 2_000 },
      price: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
      wholesalePrice: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
      currency: { bsonType: "string", pattern: "^[A-Z]{3}$" },
      partnerCommission: {
        bsonType: ["double", "int", "long", "decimal"],
        minimum: 0,
        maximum: 100,
      },
      supplierCompanyId: { bsonType: "string" },
      storeId: { bsonType: "string" },
      status: { enum: ["active", "draft", "archived"] },
      publication: {
        bsonType: "object",
        required: ["marketplace", "partnerProgram", "aiQualitet"],
        properties: {
          marketplace: { enum: ["published", "unpublished"] },
          partnerProgram: { enum: ["published", "unpublished"] },
          aiQualitet: { enum: ["published", "unpublished"] },
        },
      },
      distributionChannels: { bsonType: "array", items: { bsonType: "string" } },
      createdBy: { bsonType: "string" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      archivedAt: { bsonType: "date" },
    },
  },
  carts: {
    bsonType: "object",
    required: ["customerId", "items", "status", "createdAt", "updatedAt"],
    properties: {
      customerId: { bsonType: "string" },
      items: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["productId", "quantity", "addedAt"],
          properties: {
            productId: { bsonType: "string" },
            quantity: { bsonType: ["int", "long"], minimum: 1 },
            addedAt: { bsonType: "date" },
          },
        },
      },
      status: { enum: ["active", "converted", "abandoned"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  orders: {
    bsonType: "object",
    required: [
      "customerId",
      "items",
      "subtotal",
      "total",
      "currency",
      "status",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      customerId: { bsonType: "string" },
      items: {
        bsonType: "array",
        minItems: 1,
        items: {
          bsonType: "object",
          required: ["productId", "name", "quantity", "unitPrice", "currency"],
          properties: {
            productId: { bsonType: "string" },
            name: { bsonType: "string", minLength: 1, maxLength: 200 },
            sku: { bsonType: "string", maxLength: 100 },
            supplierCompanyId: { bsonType: "string" },
            quantity: { bsonType: ["int", "long"], minimum: 1 },
            unitPrice: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
            currency: { bsonType: "string", pattern: "^[A-Z]{3}$" },
          },
        },
      },
      subtotal: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
      total: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
      currency: { bsonType: "string", pattern: "^[A-Z]{3}$" },
      status: {
        enum: ["pending_payment", "paid", "processing", "fulfilled", "cancelled", "refunded"],
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  payments: {
    bsonType: "object",
    required: [
      "orderId",
      "customerId",
      "provider",
      "amount",
      "currency",
      "status",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      orderId: { bsonType: "string" },
      customerId: { bsonType: "string" },
      provider: { enum: ["stripe"] },
      amount: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
      currency: { bsonType: "string", pattern: "^[A-Z]{3}$" },
      status: {
        enum: ["created", "processing", "succeeded", "failed", "cancelled", "refunded"],
      },
      stripeCheckoutSessionId: { bsonType: "string" },
      stripePaymentIntentId: { bsonType: "string" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  stores: {
    bsonType: "object",
    required: ["name", "status", "createdAt"],
    properties: {
      name: { bsonType: "string" },
      ownerUserId: { bsonType: "string" },
      slug: { bsonType: "string" },
      domain: { bsonType: "string" },
      status: { bsonType: "string" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  categories: {
    bsonType: "object",
    required: ["name", "slug", "createdAt", "updatedAt"],
    properties: {
      name: { bsonType: "string" },
      slug: { bsonType: "string" },
      description: { bsonType: "string" },
      parentId: { bsonType: "string" },
      status: { enum: ["active", "archived"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  subscriptions: {
    bsonType: "object",
    required: ["plan", "status", "createdAt", "updatedAt"],
    properties: {
      userId: { bsonType: "string" },
      companyId: { bsonType: "string" },
      plan: { bsonType: "string" },
      status: { enum: ["trialing", "active", "past_due", "cancelled", "expired"] },
      currentPeriodStart: { bsonType: "date" },
      currentPeriodEnd: { bsonType: "date" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  invoices: {
    bsonType: "object",
    required: ["invoiceNumber", "amount", "currency", "status", "createdAt", "updatedAt"],
    properties: {
      invoiceNumber: { bsonType: "string" },
      subscriptionId: { bsonType: "string" },
      userId: { bsonType: "string" },
      amount: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
      currency: { bsonType: "string", pattern: "^[A-Z]{3}$" },
      status: { enum: ["draft", "open", "paid", "void", "uncollectible"] },
      dueAt: { bsonType: "date" },
      paidAt: { bsonType: "date" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
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
  {
    keys: Document;
    options?: {
      unique?: boolean;
      expireAfterSeconds?: number;
      partialFilterExpression?: Document;
    };
  }[]
> = {
  users: [
    { keys: { email: 1 }, options: { unique: true } },
    { keys: { referredByPartnerId: 1 } },
  ],
  roles: [{ keys: { key: 1 }, options: { unique: true } }],
  permissions: [{ keys: { key: 1 }, options: { unique: true } }],
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
  ai_memory: [
    { keys: { key: 1, ownerId: 1 }, options: { unique: true } },
    { keys: { ownerId: 1, type: 1, updatedAt: -1 } },
  ],
  integrations: [{ keys: { provider: 1 }, options: { unique: true } }],
  integration_configs: [
    { keys: { provider: 1 }, options: { unique: true } },
    { keys: { updatedAt: -1 } },
  ],
  audit_logs: [{ keys: { createdAt: -1 } }, { keys: { actorId: 1, createdAt: -1 } }],
  notifications: [
    { keys: { recipientId: 1, createdAt: -1 } },
    { keys: { recipientId: 1, readAt: 1 } },
  ],
  system_health: [{ keys: { checkedAt: -1 } }],
  companies: [
    { keys: { email: 1 } },
    { keys: { ownerUserId: 1, status: 1 } },
    { keys: { status: 1, type: 1, createdAt: -1 } },
  ],
  suppliers: [{ keys: { companyId: 1 }, options: { unique: true } }, { keys: { status: 1, createdAt: -1 } }],
  partners: [
    { keys: { userId: 1 } },
    { keys: { companyId: 1 } },
    {
      keys: { referralCode: 1 },
      options: {
        unique: true,
        partialFilterExpression: { referralCode: { $type: "string" } },
      },
    },
  ],
  advertisers: [{ keys: { userId: 1 } }, { keys: { companyId: 1 } }],
  crm_contacts: [{ keys: { email: 1 } }, { keys: { companyId: 1 } }],
  leads: [
    { keys: { status: 1, createdAt: -1 } },
    { keys: { email: 1 } },
    { keys: { website: 1 } },
  ],
  outreach_campaigns: [{ keys: { status: 1, createdAt: -1 } }],
  campaigns: [
    { keys: { advertiserId: 1, status: 1, createdAt: -1 } },
    { keys: { status: 1, startsAt: 1 } },
  ],
  products: [
    { keys: { name: 1 } },
    { keys: { status: 1 } },
    { keys: { status: 1, archivedAt: 1, createdAt: -1 } },
    { keys: { supplierCompanyId: 1, sku: 1 } },
  ],
  carts: [
    { keys: { customerId: 1, status: 1 } },
    { keys: { updatedAt: -1 } },
  ],
  orders: [
    { keys: { customerId: 1, createdAt: -1 } },
    { keys: { status: 1, createdAt: -1 } },
  ],
  payments: [
    { keys: { orderId: 1, createdAt: -1 } },
    { keys: { status: 1, createdAt: -1 } },
  ],
  stores: [{ keys: { name: 1 } }],
  categories: [{ keys: { slug: 1 } }, { keys: { parentId: 1 } }],
  subscriptions: [
    { keys: { userId: 1, status: 1 } },
    { keys: { companyId: 1, status: 1 } },
    { keys: { currentPeriodEnd: 1 } },
  ],
  invoices: [
    { keys: { invoiceNumber: 1 }, options: { unique: true } },
    { keys: { userId: 1, createdAt: -1 } },
    { keys: { status: 1, dueAt: 1 } },
  ],
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

    const seededPermissions = [
      {
        key: "resources:read",
        resource: "resources",
        action: "read",
        description: "Odczyt chronionych zasobów platformy.",
      },
      {
        key: "resources:write",
        resource: "resources",
        action: "write",
        description: "Tworzenie i aktualizacja dozwolonych zasobów platformy.",
      },
    ];
    await Promise.all(
      seededPermissions.map((permission) =>
        database.collection("permissions").updateOne(
          { key: permission.key },
          {
            $setOnInsert: {
              ...permission,
              createdAt: now,
              updatedAt: now,
            },
          },
          { upsert: true },
        ),
      ),
    );

    const rolePermissions: Record<string, string[]> = {
      owner: ["resources:read", "resources:write"],
      admin: ["resources:read", "resources:write"],
      user: [],
    };
    await Promise.all(
      Object.entries(rolePermissions).map(([key, permissions]) =>
        database.collection("roles").updateOne(
          { key },
          {
            $setOnInsert: {
              key,
              name: key[0].toUpperCase() + key.slice(1),
              permissions,
              createdAt: now,
              updatedAt: now,
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

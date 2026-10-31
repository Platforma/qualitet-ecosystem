import { MongoClient } from "mongodb";
import { connection, NextResponse } from "next/server";
import { databaseCollections } from "../../../lib/database-collections";

type CollectionState = "present" | "missing" | "unavailable" | "unconfigured";
type DatabaseState = "connected" | "unavailable" | "unconfigured";

type DatabaseResponse = {
  checkedAt: string;
  state: DatabaseState;
  collections: { name: string; state: CollectionState }[];
};

const cacheDurationMs = 30_000;
let cachedResponse: { expiresAt: number; body: DatabaseResponse } | null = null;
let pendingCheck: Promise<DatabaseResponse> | null = null;

function getDatabaseName(uri: string): string | null {
  const configuredName = process.env.MONGODB_DATABASE?.trim();
  if (configuredName) {
    return configuredName;
  }

  try {
    const path = new URL(uri).pathname.replace(/^\//, "");
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

function createResponse(
  state: DatabaseState,
  collectionState: CollectionState,
  presentNames: Set<string> = new Set(),
): DatabaseResponse {
  return {
    checkedAt: new Date().toISOString(),
    state,
    collections: databaseCollections.map(({ name }) => ({
      name,
      state:
        collectionState === "present" || collectionState === "missing"
          ? presentNames.has(name)
            ? "present"
            : "missing"
          : collectionState,
    })),
  };
}

async function checkDatabase(): Promise<DatabaseResponse> {
  const uri = process.env.MONGODB_URI;
  const databaseName = uri ? getDatabaseName(uri) : null;

  if (!uri || !databaseName) {
    return createResponse("unconfigured", "unconfigured");
  }

  const client = new MongoClient(uri, {
    connectTimeoutMS: 4_000,
    maxPoolSize: 1,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 4_000,
  });

  try {
    await client.connect();
    const database = client.db(databaseName);
    await database.admin().command({ ping: 1 });
    const collections = await database
      .listCollections({}, { nameOnly: true })
      .toArray();
    const presentNames = new Set(collections.map(({ name }) => name));

    return createResponse("connected", "present", presentNames);
  } catch {
    return createResponse("unavailable", "unavailable");
  } finally {
    try {
      await client.close();
    } catch {
      // The collection status has already been determined.
    }
  }
}

export async function GET(request: Request) {
  try {
    await connection();
    const forceRefresh =
      new URL(request.url).searchParams.get("refresh") === "1";

    if (
      !forceRefresh &&
      cachedResponse &&
      cachedResponse.expiresAt > Date.now()
    ) {
      return NextResponse.json(cachedResponse.body, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (forceRefresh) {
      cachedResponse = null;
    }

    pendingCheck ??= checkDatabase()
      .then((body) => {
        cachedResponse = { body, expiresAt: Date.now() + cacheDurationMs };
        return body;
      })
      .finally(() => {
        pendingCheck = null;
      });

    const body = await pendingCheck;
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Nie udało się odczytać statusu kolekcji MongoDB." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
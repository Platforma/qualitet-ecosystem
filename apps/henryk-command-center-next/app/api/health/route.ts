import { MongoClient } from "mongodb";
import { connection, NextResponse } from "next/server";
import { getCollection } from "../../../lib/server/database";

type DependencyState = "connected" | "unavailable" | "unconfigured";

async function checkMongoDb(uri: string): Promise<DependencyState> {
  let client: MongoClient | undefined;

  try {
    client = new MongoClient(uri, {
      connectTimeoutMS: 3_000,
      maxPoolSize: 1,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 3_000,
    });
    await client.connect();
    await client.db().admin().command({ ping: 1 });
    return "connected";
  } catch {
    return "unavailable";
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {
        // The ping result determines the dependency status.
      }
    }
  }
}

export async function GET() {
  await connection();

  const mongodbUri = process.env.MONGODB_URI;
  const databaseState = mongodbUri
    ? await checkMongoDb(mongodbUri)
    : "unconfigured";
  let systemHealthStored: boolean | null = null;
  if (databaseState === "connected") {
    try {
      const checkedAt = new Date();
      await getCollection("system_health").then((collection) =>
        collection.updateOne(
          { component: "henryk-command-center" },
          {
            $set: {
              component: "henryk-command-center",
              status: "healthy",
              checkedAt,
              components: { mongodb: "connected" },
            },
          },
          { upsert: true },
        ),
      );
      systemHealthStored = true;
    } catch (error) {
      console.error(
        "System health snapshot failed:",
        error instanceof Error ? error.name : "UnknownError",
      );
      systemHealthStored = false;
    }
  }
  const database =
    databaseState === "connected" && systemHealthStored === false
      ? "unavailable"
      : databaseState;
  const checkedAt = new Date().toISOString();

  return NextResponse.json(
    {
      status: database === "connected" ? "healthy" : "degraded",
      checkedAt,
      uptimeSeconds: Math.floor(process.uptime()),
      systemHealthStored,
      database: {
        state: database,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

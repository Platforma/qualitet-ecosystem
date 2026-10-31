import { MongoClient } from "mongodb";
import { connection, NextResponse } from "next/server";

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
  const database = mongodbUri
    ? await checkMongoDb(mongodbUri)
    : "unconfigured";
  const checkedAt = new Date().toISOString();

  return NextResponse.json(
    {
      status: database === "connected" ? "healthy" : "degraded",
      checkedAt,
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        state: database,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

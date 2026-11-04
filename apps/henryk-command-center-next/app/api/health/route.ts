import { connection, NextResponse } from "next/server";
import { getCollection, getDatabase } from "../../../lib/server/database";

type DependencyState = "connected" | "unavailable" | "unconfigured";

async function checkMongoDb(): Promise<DependencyState> {
  if (!process.env.MONGODB_URI?.trim()) {
    return "unconfigured";
  }
  try {
    const database = await getDatabase();
    await database.admin().command({ ping: 1 });
    return "connected";
  } catch {
    return "unavailable";
  }
}

export async function GET() {
  await connection();

  const databaseState = await checkMongoDb();
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

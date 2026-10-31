const { MongoClient } = require("mongodb");
const memorySchema = require("../memory/memory.schema.json");

let clientPromise;

function getDatabaseName(uri) {
  const configuredName = process.env.MONGODB_DATABASE?.trim();
  if (configuredName) return configuredName;

  try {
    const databaseName = decodeURIComponent(new URL(uri).pathname.slice(1));
    return databaseName || memorySchema.database;
  } catch {
    throw new Error("MONGODB_URI is not a valid MongoDB connection string.");
  }
}

async function getMongoClient() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MongoDB is not configured.");

  if (!clientPromise) {
    const client = new MongoClient(uri, {
      appName: "qualitet-ai-foundation",
      connectTimeoutMS: 5000,
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
    });
    clientPromise = client.connect().catch((error) => {
      clientPromise = undefined;
      throw error;
    });
  }

  return clientPromise;
}

async function getMemoryCollection(section) {
  const definition = memorySchema.sections[section];
  if (!definition) throw new Error(`Unknown memory section: ${section}`);

  const client = await getMongoClient();
  return client
    .db(getDatabaseName(process.env.MONGODB_URI.trim()))
    .collection(definition.collection);
}

async function closeMongoConnection() {
  if (!clientPromise) return;
  const client = await clientPromise;
  clientPromise = undefined;
  await client.close();
}

module.exports = { closeMongoConnection, getMemoryCollection, getMongoClient };

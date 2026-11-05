import { MongoClient, type Db } from "mongodb";

type ShopMongoGlobals = typeof globalThis & {
  __shopQualitetMongoClient?: MongoClient;
  __shopQualitetMongoDatabasePromise?: Promise<Db>;
};

const mongoGlobals = globalThis as ShopMongoGlobals;

export async function getShopDatabase(): Promise<Db> {
  if (!mongoGlobals.__shopQualitetMongoDatabasePromise) {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
      throw new Error("MONGODB_URI must be configured for Shop Qualitet.");
    }

    mongoGlobals.__shopQualitetMongoClient ??= new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5_000,
    });

    mongoGlobals.__shopQualitetMongoDatabasePromise =
      mongoGlobals.__shopQualitetMongoClient
        .connect()
        .then((client) => {
          const databaseName = process.env.MONGODB_DATABASE?.trim();
          return databaseName ? client.db(databaseName) : client.db();
        })
        .catch((error: unknown) => {
          mongoGlobals.__shopQualitetMongoDatabasePromise = undefined;
          throw error;
        });
  }

  return mongoGlobals.__shopQualitetMongoDatabasePromise;
}

import { MongoClient, type Db } from "mongodb";
import { requireAdmin } from "./session";

const uri = process.env.MONGODB_URL ?? "mongodb://127.0.0.1:27017/cellix";
const dbName = process.env.MONGODB_DB_NAME ?? "cellix";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClient(): Promise<MongoClient> {
  return new MongoClient(uri).connect();
}

const clientPromise =
  process.env.NODE_ENV === "development"
    ? (global._mongoClientPromise ??= createClient())
    : createClient();

/** The only way data code reaches Mongo, so no query can run without an admin session. */
export async function adminDb(): Promise<Db> {
  await requireAdmin();
  const client = await clientPromise;
  return client.db(dbName);
}

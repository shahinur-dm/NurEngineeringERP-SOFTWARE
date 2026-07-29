import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryUri?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

global.mongooseCache = cached;

async function resolveMongoUri() {
  const configured = process.env.MONGODB_URI?.trim();
  const useMemory =
    !configured ||
    configured === "memory" ||
    process.env.USE_MEMORY_MONGO === "1";

  if (!useMemory) return configured;

  if (cached.memoryUri) return cached.memoryUri;

  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongod = await MongoMemoryServer.create({
    instance: { dbName: "dit_pos" },
  });
  cached.memoryUri = mongod.getUri("dit_pos");
  console.info("[db] Using in-memory MongoDB (no Docker required)");
  return cached.memoryUri;
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = (async () => {
      const uri = await resolveMongoUri();
      return mongoose.connect(uri, {
        bufferCommands: false,
        dbName: "dit_pos",
      });
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

/** Drop collections in dit_pos that are not registered Mongoose models. */
export async function pruneOrphanCollections() {
  const conn = await connectDB();
  const db = conn.connection.db;
  if (!db) return { dropped: [] as string[] };

  const keep = new Set(
    Object.values(mongoose.models).map((m) => m.collection.collectionName),
  );

  const dropped: string[] = [];
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const name = col.name;
    if (name.startsWith("system.") || keep.has(name)) continue;
    try {
      await db.dropCollection(name);
      dropped.push(name);
    } catch {
      // ignore locked / missing
    }
  }
  return { dropped };
}

/** Drop empty collections cluster-wide — empty namespaces still count toward Atlas M0 500 limit. */
export async function pruneEmptyCollectionsClusterWide() {
  const conn = await connectDB();
  const client = conn.connection.getClient();
  const admin = client.db().admin();
  const { databases } = await admin.listDatabases();
  const dropped: string[] = [];
  const skipDb = new Set(["admin", "local", "config"]);

  for (const { name: dbName } of databases) {
    if (skipDb.has(dbName)) continue;
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      if (col.name.startsWith("system.")) continue;
      try {
        const stats = await db.collection(col.name).estimatedDocumentCount();
        if (stats === 0) {
          await db.dropCollection(col.name);
          dropped.push(`${dbName}.${col.name}`);
        }
      } catch {
        // ignore
      }
    }
  }
  return { dropped };
}

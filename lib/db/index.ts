import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/tnea.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

const globalForDb = globalThis as unknown as {
  __tneaDbClient?: ReturnType<typeof createClient>;
};

const client =
  globalForDb.__tneaDbClient ??
  createClient({
    url,
    authToken,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__tneaDbClient = client;
}

export const db = drizzle(client, { schema });
export { client };
export type Database = typeof db;

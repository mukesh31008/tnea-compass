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

// Best-effort for local SQLite. Account deletion also removes child rows
// explicitly, so it does not depend on this pragma being applied first.
void client.execute("PRAGMA foreign_keys = ON").catch(() => undefined);

if (process.env.NODE_ENV !== "production") {
  globalForDb.__tneaDbClient = client;
}

export const db = drizzle(client, { schema });
export { client };
export type Database = typeof db;

import { mkdirSync } from "node:fs";

import { migrate } from "drizzle-orm/libsql/migrator";

import { client, db } from "../lib/db";

async function main() {
  mkdirSync("data", { recursive: true });
  await client.execute("PRAGMA foreign_keys = ON");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    client.close();
  });

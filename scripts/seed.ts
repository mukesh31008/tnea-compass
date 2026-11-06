import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { and, isNotNull, ne, sql } from "drizzle-orm";

import { client, db } from "../lib/db";
import * as schema from "../lib/db/schema";

type NewCollege = typeof schema.colleges.$inferInsert;
type NewBranch = typeof schema.branches.$inferInsert;
type NewCollegeBranch = typeof schema.collegeBranches.$inferInsert;
type NewCutoff = typeof schema.cutoffs.$inferInsert;
type NewSeat = typeof schema.seatMatrix.$inferInsert;
type NewHostel = typeof schema.hostels.$inferInsert;
type NewFee = typeof schema.fees.$inferInsert;

type Manifest = {
  counts: Record<string, number>;
};

const SEED_DIR = join(process.cwd(), "data", "seed");

function readNdjson<T>(name: string): T[] {
  const compressed = readFileSync(join(SEED_DIR, `${name}.ndjson.gz`));
  const text = gunzipSync(compressed).toString("utf8");
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

function chunks<T>(rows: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }
  return result;
}

async function countRows(table: Parameters<typeof db.$count>[0]): Promise<number> {
  return db.$count(table);
}

async function main() {
  mkdirSync("data", { recursive: true });

  const manifest = JSON.parse(
    readFileSync(join(SEED_DIR, "manifest.json"), "utf8"),
  ) as Manifest;

  const colleges = readNdjson<NewCollege>("colleges");
  const branches = readNdjson<NewBranch>("branches");
  const collegeBranches = readNdjson<NewCollegeBranch>("college_branches");
  const cutoffs = readNdjson<NewCutoff>("cutoffs");
  const seats = readNdjson<NewSeat>("seat_matrix");
  const hostels = readNdjson<NewHostel>("hostels");
  const fees = readNdjson<NewFee>("fees");

  console.log("Seeding TNEA Compass");
  console.log(
    [
      `${colleges.length} colleges`,
      `${branches.length} branches`,
      `${collegeBranches.length} college branches`,
      `${cutoffs.length} cutoffs`,
      `${seats.length} seat rows`,
    ].join(", "),
  );

  await client.execute("PRAGMA foreign_keys = ON");

  await db.transaction(async (tx) => {
    await tx.delete(schema.cutoffs);
    await tx.delete(schema.seatMatrix);
    await tx.delete(schema.collegeBranches);
    await tx.delete(schema.fees);
    await tx.delete(schema.hostels);
    await tx.delete(schema.colleges);
    await tx.delete(schema.branches);

    for (const chunk of chunks(colleges, 50)) {
      await tx.insert(schema.colleges).values(chunk);
    }
    for (const chunk of chunks(branches, 200)) {
      await tx.insert(schema.branches).values(chunk);
    }
    for (const chunk of chunks(collegeBranches, 100)) {
      await tx.insert(schema.collegeBranches).values(chunk);
    }
    for (const chunk of chunks(cutoffs, 300)) {
      await tx.insert(schema.cutoffs).values(chunk);
    }
    for (const chunk of chunks(seats, 200)) {
      await tx.insert(schema.seatMatrix).values(chunk);
    }
    for (const chunk of chunks(hostels, 200)) {
      await tx.insert(schema.hostels).values(chunk);
    }
    for (const chunk of chunks(fees, 200)) {
      await tx.insert(schema.fees).values(chunk);
    }
  });

  const counts = {
    colleges: await countRows(schema.colleges),
    branches: await countRows(schema.branches),
    collegeBranches: await countRows(schema.collegeBranches),
    cutoffs: await countRows(schema.cutoffs),
    seatMatrix: await countRows(schema.seatMatrix),
    hostels: await countRows(schema.hostels),
    fees: await countRows(schema.fees),
  };

  const expected = manifest.counts;
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (counts[key as keyof typeof counts] !== expectedValue) {
      throw new Error(
        `count mismatch for ${key}: expected ${expectedValue}, got ${counts[key as keyof typeof counts]}`,
      );
    }
  }

  const foreignKeyErrors = await client.execute("PRAGMA foreign_key_check");
  if (foreignKeyErrors.rows.length > 0) {
    throw new Error(`foreign key check failed: ${JSON.stringify(foreignKeyErrors.rows.slice(0, 5))}`);
  }

  const rankCheck = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.cutoffs)
    .where(and(isNotNull(schema.cutoffs.generalRank), ne(schema.cutoffs.year, 2025)));
  if (Number(rankCheck[0]?.count ?? 0) !== 0) {
    throw new Error("non-2025 closing ranks found");
  }

  const peri = await client.execute(
    "SELECT COUNT(*) AS n FROM college_branches WHERE college_code = '1452' AND branch_code = 'AM'",
  );
  if (Number(peri.rows[0]?.n ?? 0) !== 2) {
    throw new Error("PERI AM should have two programmes");
  }

  console.log("Verified counts:", counts);
  console.log(`Foreign key check: ${foreignKeyErrors.rows.length} errors`);
  console.log("Closing ranks are present for 2025 only.");

  const ceg = await client.execute(`
    SELECT c.community, c.cutoff_mark, c.general_rank
    FROM cutoffs c
    JOIN college_branches cb ON cb.id = c.college_branch_id
    WHERE cb.college_code = '0001' AND cb.branch_code = 'CS' AND c.year = 2025
    ORDER BY c.community
  `);
  console.log("CEG CS 2025:", ceg.rows);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    client.close();
  });

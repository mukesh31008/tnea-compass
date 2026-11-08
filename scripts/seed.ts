import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { and, isNotNull, notInArray, sql } from "drizzle-orm";

import { client, db } from "../lib/db";
import * as schema from "../lib/db/schema";

type NewCollege = typeof schema.colleges.$inferInsert;
type NewBranch = typeof schema.branches.$inferInsert;
type NewCollegeBranch = typeof schema.collegeBranches.$inferInsert;
type NewCutoff = typeof schema.cutoffs.$inferInsert;
type NewRoundCutoff = typeof schema.roundCutoffs.$inferInsert;
type NewSeat = typeof schema.seatMatrix.$inferInsert;
type NewVacancy = typeof schema.vacancies.$inferInsert;
type NewSourceDocument = typeof schema.sourceDocuments.$inferInsert;
type NewHostel = typeof schema.hostels.$inferInsert;
type NewFee = typeof schema.fees.$inferInsert;

type Manifest = {
  counts: Record<string, number>;
  cutoffYears: Record<string, number>;
  generalRanks: number;
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

  const baseColleges = readNdjson<NewCollege>("colleges");
  const baseBranches = readNdjson<NewBranch>("branches");
  const baseCollegeBranches = readNdjson<NewCollegeBranch>("college_branches");
  const baseCutoffs = readNdjson<NewCutoff>("cutoffs");
  const baseSeats = readNdjson<NewSeat>("seat_matrix");
  const hostels = readNdjson<NewHostel>("hostels");
  const fees = readNdjson<NewFee>("fees");

  const sourceDocuments = readNdjson<NewSourceDocument>("source_documents");
  const colleges2026 = readNdjson<NewCollege>("colleges_2026");
  const branches2026 = readNdjson<NewBranch>("branches_2026");
  const collegeBranches2026 = readNdjson<NewCollegeBranch>("college_branches_2026");
  const cutoffs2026 = readNdjson<NewCutoff>("cutoffs_2026");
  const roundCutoffs = readNdjson<NewRoundCutoff>("round_cutoffs");
  const seats2026 = readNdjson<NewSeat>("seat_matrix_2026");
  const vacancies2026 = readNdjson<NewVacancy>("vacancies_2026");

  const colleges = [...baseColleges, ...colleges2026];
  const branches = [...baseBranches, ...branches2026];
  const collegeBranches = [...baseCollegeBranches, ...collegeBranches2026];
  const cutoffs = [...baseCutoffs, ...cutoffs2026];
  const seats = [...baseSeats, ...seats2026];

  console.log("Seeding TNEA Compass");
  console.log(
    [
      `${colleges.length} colleges`,
      `${branches.length} branches`,
      `${collegeBranches.length} college branches`,
      `${cutoffs.length} cutoffs`,
      `${seats.length} seat rows`,
      `${roundCutoffs.length} round closes`,
      `${vacancies2026.length} vacancy rows`,
      `${sourceDocuments.length} source documents`,
    ].join(", "),
  );

  await client.execute("PRAGMA foreign_keys = ON");

  await db.transaction(async (tx) => {
    // Children first so foreign keys never dangle during a reseed.
    await tx.delete(schema.roundCutoffs);
    await tx.delete(schema.vacancies);
    await tx.delete(schema.cutoffs);
    await tx.delete(schema.seatMatrix);
    await tx.delete(schema.collegeBranches);
    await tx.delete(schema.fees);
    await tx.delete(schema.hostels);
    await tx.delete(schema.colleges);
    await tx.delete(schema.branches);
    await tx.delete(schema.sourceDocuments);

    for (const chunk of chunks(sourceDocuments, 50)) {
      await tx.insert(schema.sourceDocuments).values(chunk);
    }
    for (const chunk of chunks(baseColleges, 50)) {
      await tx.insert(schema.colleges).values(chunk);
    }
    for (const chunk of chunks(colleges2026, 50)) {
      await tx.insert(schema.colleges).values(chunk);
    }
    for (const chunk of chunks(baseBranches, 200)) {
      await tx.insert(schema.branches).values(chunk);
    }
    for (const chunk of chunks(branches2026, 200)) {
      await tx.insert(schema.branches).values(chunk);
    }
    for (const chunk of chunks(baseCollegeBranches, 100)) {
      await tx.insert(schema.collegeBranches).values(chunk);
    }
    for (const chunk of chunks(collegeBranches2026, 100)) {
      await tx.insert(schema.collegeBranches).values(chunk);
    }
    for (const chunk of chunks(baseCutoffs, 300)) {
      await tx.insert(schema.cutoffs).values(chunk);
    }
    for (const chunk of chunks(cutoffs2026, 300)) {
      await tx.insert(schema.cutoffs).values(chunk);
    }
    for (const chunk of chunks(roundCutoffs, 300)) {
      await tx.insert(schema.roundCutoffs).values(chunk);
    }
    for (const chunk of chunks(baseSeats, 200)) {
      await tx.insert(schema.seatMatrix).values(chunk);
    }
    for (const chunk of chunks(seats2026, 200)) {
      await tx.insert(schema.seatMatrix).values(chunk);
    }
    for (const chunk of chunks(vacancies2026, 300)) {
      await tx.insert(schema.vacancies).values(chunk);
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
    roundCutoffs: await countRows(schema.roundCutoffs),
    vacancies: await countRows(schema.vacancies),
    sourceDocuments: await countRows(schema.sourceDocuments),
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
    throw new Error(
      `foreign key check failed: ${JSON.stringify(foreignKeyErrors.rows.slice(0, 5))}`,
    );
  }

  // Closing ranks exist only for the published 2025 and 2026 exports.
  const rankCheck = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.cutoffs)
    .where(
      and(
        isNotNull(schema.cutoffs.generalRank),
        notInArray(schema.cutoffs.year, [2025, 2026]),
      ),
    );
  if (Number(rankCheck[0]?.count ?? 0) !== 0) {
    throw new Error("closing ranks found outside 2025 and 2026");
  }

  // Every published 2026 close must point at the exact document and page.
  const unprovenanced = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.cutoffs)
    .where(
      and(
        sql`${schema.cutoffs.year} = 2026`,
        sql`(${schema.cutoffs.sourceDocumentId} IS NULL OR ${schema.cutoffs.sourcePage} IS NULL OR ${schema.cutoffs.sourceRound} IS NULL)`,
      ),
    );
  if (Number(unprovenanced[0]?.count ?? 0) !== 0) {
    throw new Error("2026 cutoffs without a source document, page or round");
  }

  // The final 2026 close must equal the cumulative close after Round 3.
  const finalMismatch = await client.execute(`
    SELECT COUNT(*) AS n
    FROM cutoffs c
    JOIN round_cutoffs r
      ON r.college_branch_id = c.college_branch_id
     AND r.community = c.community
     AND r.year = c.year
     AND r.round = 3
    WHERE c.year = 2026
      AND (
        r.general_rank IS NOT c.general_rank
        OR r.cutoff_mark IS NOT c.cutoff_mark
        OR r.source_page IS NOT c.source_page
        OR r.source_round IS NOT c.source_round
      )
  `);
  if (Number(finalMismatch.rows[0]?.n ?? 0) !== 0) {
    throw new Error("2026 final close does not match the Round 3 cumulative close");
  }

  // Closing ranks must worsen (never improve) as later rounds are included.
  const nonMonotonic = await client.execute(`
    SELECT COUNT(*) AS n
    FROM round_cutoffs a
    JOIN round_cutoffs b
      ON b.college_branch_id = a.college_branch_id
     AND b.community = a.community
     AND b.year = a.year
     AND b.round = a.round + 1
    WHERE a.year = 2026 AND b.general_rank < a.general_rank
  `);
  if (Number(nonMonotonic.rows[0]?.n ?? 0) !== 0) {
    throw new Error("round closes are not monotonic for 2026");
  }

  const rankTotal = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.cutoffs)
    .where(isNotNull(schema.cutoffs.generalRank));
  if (Number(rankTotal[0]?.count ?? 0) !== manifest.generalRanks) {
    throw new Error(
      `general rank count mismatch: expected ${manifest.generalRanks}, got ${rankTotal[0]?.count}`,
    );
  }

  const peri = await client.execute(
    "SELECT COUNT(*) AS n FROM college_branches WHERE college_code = '1452' AND branch_code = 'AM'",
  );
  if (Number(peri.rows[0]?.n ?? 0) !== 2) {
    throw new Error("PERI AM should have two programmes");
  }

  console.log("Verified counts:", counts);
  console.log(`Foreign key check: ${foreignKeyErrors.rows.length} errors`);
  console.log("Closing ranks are present for 2025 and 2026 only.");

  const ceg = await client.execute(`
    SELECT c.community, c.cutoff_mark, c.general_rank, c.source_round, c.source_page
    FROM cutoffs c
    JOIN college_branches cb ON cb.id = c.college_branch_id
    WHERE cb.college_code = '0001' AND cb.branch_code = 'CS' AND c.year = 2026
    ORDER BY c.community
  `);
  console.log("CEG CS 2026 (allotted community):", ceg.rows);

  const mass = await client.execute(`
    SELECT c.cutoff_mark, c.general_rank, c.source_round, c.source_page
    FROM cutoffs c
    JOIN college_branches cb ON cb.id = c.college_branch_id
    WHERE cb.college_code = '3838' AND cb.branch_code = 'CS' AND c.community = 'OC' AND c.year = 2026
  `);
  console.log("Mass Engineering College CS OC 2026:", mass.rows);

  const seats2026Total = await client.execute(
    "SELECT SUM(total_seats) AS n FROM seat_matrix WHERE year = 2026",
  );
  console.log("2026 seats:", seats2026Total.rows[0]?.n);
  const vac2026Total = await client.execute(
    "SELECT SUM(vacant_seats) AS n FROM vacancies WHERE year = 2026",
  );
  console.log("2026 vacancies:", vac2026Total.rows[0]?.n);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    client.close();
  });

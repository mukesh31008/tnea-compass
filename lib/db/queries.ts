import "server-only";

import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  exists,
  isNotNull,
  like,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import seedManifest from "@/data/seed/manifest.json";
import { db } from "@/lib/db";
import {
  branches,
  collegeBranches,
  colleges,
  cutoffs,
  fees,
  hostels,
  seatMatrix,
} from "@/lib/db/schema";

export type YearCount = { year: number; count: number };
export type TypeCount = { type: string; count: number };

export type DatasetStats = {
  colleges: number;
  branches: number;
  collegeBranches: number;
  cutoffs: number;
  seats: number;
  hostels: number;
  fees: number;
  districts: number;
  generalRanks: number;
  cutoffYears: YearCount[];
  collegeTypes: TypeCount[];
  fromDatabase: boolean;
};

export type DistrictOption = {
  district: string;
  colleges: number;
};

export type BranchOption = {
  code: string;
  name: string;
  colleges: number;
};

export type CollegeHit = {
  code: string;
  name: string;
  shortName: string | null;
  district: string | null;
  type: string;
  autonomous: boolean | null;
  branchCount: number;
};

export type CollegeSearchParams = {
  q?: string;
  district?: string;
  type?: string;
  branch?: string;
  hostel?: "any" | "boys" | "girls";
  autonomous?: boolean;
  page?: number;
  limit?: number;
  sort?: "name" | "code";
};

export type CollegeSearchResult = {
  colleges: CollegeHit[];
  total: number;
  page: number;
  pages: number;
};

function fallbackStats(): DatasetStats {
  return {
    colleges: seedManifest.counts.colleges,
    branches: seedManifest.counts.branches,
    collegeBranches: seedManifest.counts.collegeBranches,
    cutoffs: seedManifest.counts.cutoffs,
    seats: seedManifest.counts.seatMatrix,
    hostels: seedManifest.counts.hostels,
    fees: seedManifest.counts.fees,
    districts: seedManifest.districts ?? 0,
    generalRanks: seedManifest.generalRanks,
    cutoffYears: Object.entries(seedManifest.cutoffYears).map(
      ([year, value]) => ({ year: Number(year), count: value }),
    ),
    collegeTypes: Object.entries(seedManifest.collegeTypes).map(
      ([type, value]) => ({ type, count: value }),
    ),
    fromDatabase: false,
  };
}

/**
 * Dataset-wide counts for the landing page. If the database has not been
 * seeded yet (for example on a fresh checkout), the committed seed manifest is
 * used so the page still renders honest numbers.
 */
export async function getDatasetStats(): Promise<DatasetStats> {
  try {
    const [
      collegeCount,
      branchCount,
      collegeBranchCount,
      cutoffCount,
      seatCount,
      hostelCount,
      feeCount,
      districtCount,
      rankCount,
      cutoffYears,
      collegeTypes,
    ] = await Promise.all([
      db.select({ value: count() }).from(colleges),
      db.select({ value: count() }).from(branches),
      db.select({ value: count() }).from(collegeBranches),
      db.select({ value: count() }).from(cutoffs),
      db.select({ value: count() }).from(seatMatrix),
      db.select({ value: count() }).from(hostels),
      db.select({ value: count() }).from(fees),
      db
        .select({ value: countDistinct(colleges.district) })
        .from(colleges)
        .where(isNotNull(colleges.district)),
      db
        .select({ value: count(cutoffs.generalRank) })
        .from(cutoffs)
        .where(isNotNull(cutoffs.generalRank)),
      db
        .select({ year: cutoffs.year, count: count() })
        .from(cutoffs)
        .groupBy(cutoffs.year)
        .orderBy(asc(cutoffs.year)),
      db
        .select({ type: colleges.type, count: count() })
        .from(colleges)
        .groupBy(colleges.type)
        .orderBy(desc(count())),
    ]);

    return {
      colleges: collegeCount[0]?.value ?? 0,
      branches: branchCount[0]?.value ?? 0,
      collegeBranches: collegeBranchCount[0]?.value ?? 0,
      cutoffs: cutoffCount[0]?.value ?? 0,
      seats: seatCount[0]?.value ?? 0,
      hostels: hostelCount[0]?.value ?? 0,
      fees: feeCount[0]?.value ?? 0,
      districts: districtCount[0]?.value ?? 0,
      generalRanks: rankCount[0]?.value ?? 0,
      cutoffYears,
      collegeTypes,
      fromDatabase: true,
    };
  } catch (error) {
    console.warn("Falling back to seed manifest statistics:", error);
    return fallbackStats();
  }
}

/** Districts ordered by the number of colleges, then alphabetically. */
export async function getDistrictOptions(): Promise<DistrictOption[]> {
  return db
    .select({ district: colleges.district, colleges: count() })
    .from(colleges)
    .where(isNotNull(colleges.district))
    .groupBy(colleges.district)
    .orderBy(desc(count()), asc(colleges.district))
    .then((rows) =>
      rows
        .filter((row): row is { district: string; colleges: number } =>
          Boolean(row.district),
        )
        .map((row) => ({ district: row.district, colleges: row.colleges })),
    );
}

/** Branches ordered by how many colleges offer them. */
export async function getBranchOptions(): Promise<BranchOption[]> {
  const rows = await db
    .select({
      code: branches.code,
      name: branches.name,
      colleges: count(collegeBranches.id),
    })
    .from(branches)
    .leftJoin(collegeBranches, eq(collegeBranches.branchCode, branches.code))
    .groupBy(branches.code, branches.name)
    .having(sql`count(${collegeBranches.id}) > 0`)
    .orderBy(desc(count(collegeBranches.id)), asc(branches.name));

  return rows;
}

/**
 * Search and filter colleges. The branch, hostel and autonomous filters use
 * correlated EXISTS clauses so the result stays one row per college.
 */
export async function searchColleges(
  params: CollegeSearchParams = {},
): Promise<CollegeSearchResult> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(Math.max(Math.floor(params.limit ?? 24), 1), 100);
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];
  const term = params.q?.trim();

  if (term) {
    const pattern = `%${term}%`;
    const startsWith = `${term}%`;
    conditions.push(
      or(
        like(colleges.name, pattern),
        like(colleges.shortName, pattern),
        like(colleges.district, pattern),
        like(colleges.code, startsWith),
      )!,
    );
  }

  if (params.district) {
    conditions.push(eq(colleges.district, params.district));
  }

  if (params.type) {
    conditions.push(eq(colleges.type, params.type));
  }

  if (params.branch) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(collegeBranches)
          .where(
            and(
              eq(collegeBranches.collegeCode, colleges.code),
              eq(collegeBranches.branchCode, params.branch),
            ),
          ),
      ),
    );
  }

  if (params.autonomous !== undefined) {
    conditions.push(eq(colleges.autonomous, params.autonomous));
  }

  if (params.hostel) {
    const availability =
      params.hostel === "boys"
        ? eq(hostels.boysAvailable, true)
        : params.hostel === "girls"
          ? eq(hostels.girlsAvailable, true)
          : or(
              eq(hostels.boysAvailable, true),
              eq(hostels.girlsAvailable, true),
            )!;

    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(hostels)
          .where(and(eq(hostels.collegeCode, colleges.code), availability)),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const branchCount = sql<number>`(
    select count(*) from ${collegeBranches}
    where ${collegeBranches.collegeCode} = ${colleges.code}
  )`;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        code: colleges.code,
        name: colleges.name,
        shortName: colleges.shortName,
        district: colleges.district,
        type: colleges.type,
        autonomous: colleges.autonomous,
        branchCount,
      })
      .from(colleges)
      .where(where)
      .orderBy(
        params.sort === "code" ? asc(colleges.code) : asc(colleges.name),
      )
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(colleges).where(where),
  ]);

  const total = totalRows[0]?.value ?? 0;

  return {
    colleges: rows,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** A single college with its hostel and fee record. */
export async function getCollege(code: string) {
  const [college] = await db
    .select()
    .from(colleges)
    .where(eq(colleges.code, code))
    .limit(1);

  if (!college) return null;

  const [hostel] = await db
    .select()
    .from(hostels)
    .where(eq(hostels.collegeCode, code))
    .limit(1);

  const [fee] = await db
    .select()
    .from(fees)
    .where(eq(fees.collegeCode, code))
    .limit(1);

  return {
    college,
    hostel: hostel ?? null,
    fees: fee ?? null,
  };
}

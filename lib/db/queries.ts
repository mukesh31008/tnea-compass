import "server-only";

import {
  and,
  asc,
  avg,
  count,
  countDistinct,
  desc,
  eq,
  exists,
  gte,
  inArray,
  isNotNull,
  like,
  max,
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
  type College,
  type Fee,
  type Hostel,
} from "@/lib/db/schema";
import { type Community } from "@/lib/tnea";

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

export type CommunityCutoff = {
  mark: number | null;
  rank: number | null;
};

export type CollegeProfileBranch = {
  id: number;
  branchCode: string;
  branchName: string;
  approvedIntake: number | null;
  yearStarted: number | null;
  nba: boolean | null;
  nbaValidUpto: number | null;
  seats: {
    totalSeats: number;
    allotted: number | null;
    vacant: number | null;
  } | null;
  cutoffs2025: Partial<Record<Community, CommunityCutoff>>;
  ocHistory: Partial<Record<number, number | null>>;
};

export type CollegeProfile = {
  college: College;
  hostel: Hostel | null;
  fees: Fee | null;
  branches: CollegeProfileBranch[];
  totals: {
    branches: number;
    seats2025: number;
    allotted2025: number;
    vacant2025: number;
  };
};

/** A college profile with 2025 cutoffs, seats and OC mark history. */
export async function getCollegeProfile(
  code: string,
): Promise<CollegeProfile | null> {
  const collegeData = await getCollege(code);
  if (!collegeData) return null;

  const branchRows = await db
    .select({
      id: collegeBranches.id,
      branchCode: collegeBranches.branchCode,
      branchName: collegeBranches.branchName,
      approvedIntake: collegeBranches.approvedIntake,
      yearStarted: collegeBranches.yearStarted,
      nba: collegeBranches.nba,
      nbaValidUpto: collegeBranches.nbaValidUpto,
      totalSeats: seatMatrix.totalSeats,
      allotted: seatMatrix.allotted,
      vacant: seatMatrix.vacant,
    })
    .from(collegeBranches)
    .leftJoin(
      seatMatrix,
      and(
        eq(seatMatrix.collegeBranchId, collegeBranches.id),
        eq(seatMatrix.year, 2025),
      ),
    )
    .where(eq(collegeBranches.collegeCode, code))
    .orderBy(asc(collegeBranches.branchName), asc(collegeBranches.branchCode));

  const ids = branchRows.map((row) => row.id);
  const cutoffRows =
    ids.length > 0
      ? await db
          .select({
            collegeBranchId: cutoffs.collegeBranchId,
            year: cutoffs.year,
            community: cutoffs.community,
            cutoffMark: cutoffs.cutoffMark,
            generalRank: cutoffs.generalRank,
          })
          .from(cutoffs)
          .where(
            and(
              inArray(cutoffs.collegeBranchId, ids),
              gte(cutoffs.year, 2020),
            ),
          )
      : [];

  const byBranch = new Map<
    number,
    {
      cutoffs2025: Partial<Record<Community, CommunityCutoff>>;
      ocHistory: Partial<Record<number, number | null>>;
    }
  >();

  for (const row of branchRows) {
    byBranch.set(row.id, { cutoffs2025: {}, ocHistory: {} });
  }

  for (const row of cutoffRows) {
    const entry = byBranch.get(row.collegeBranchId);
    if (!entry) continue;

    if (row.year === 2025) {
      entry.cutoffs2025[row.community as Community] = {
        mark: row.cutoffMark,
        rank: row.generalRank,
      };
    }
    if (row.community === "OC") {
      entry.ocHistory[row.year] = row.cutoffMark;
    }
  }

  const profileBranches: CollegeProfileBranch[] = branchRows.map((row) => {
    const entry = byBranch.get(row.id);
    return {
      id: row.id,
      branchCode: row.branchCode,
      branchName: row.branchName,
      approvedIntake: row.approvedIntake,
      yearStarted: row.yearStarted,
      nba: row.nba,
      nbaValidUpto: row.nbaValidUpto,
      seats:
        row.totalSeats === null
          ? null
          : {
              totalSeats: row.totalSeats,
              allotted: row.allotted,
              vacant: row.vacant,
            },
      cutoffs2025: entry?.cutoffs2025 ?? {},
      ocHistory: entry?.ocHistory ?? {},
    };
  });

  const seats = profileBranches
    .map((branch) => branch.seats)
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return {
    ...collegeData,
    branches: profileBranches,
    totals: {
      branches: profileBranches.length,
      seats2025: seats.reduce((sum, row) => sum + row.totalSeats, 0),
      allotted2025: seats.reduce((sum, row) => sum + (row.allotted ?? 0), 0),
      vacant2025: seats.reduce((sum, row) => sum + (row.vacant ?? 0), 0),
    },
  };
}

export type CutoffExplorerRow = {
  collegeBranchId: number;
  collegeCode: string;
  collegeName: string;
  collegeShortName: string | null;
  district: string | null;
  type: string;
  branchCode: string;
  branchName: string;
  mark: number | null;
  rank: number | null;
  history: (number | null)[];
};

export type CutoffExplorerResult = {
  rows: CutoffExplorerRow[];
  total: number;
  page: number;
  pages: number;
  summary: {
    highest: number | null;
    average: number | null;
    programmes: number;
  };
};

export type CutoffExplorerParams = {
  year: number;
  community: Community;
  branch?: string;
  district?: string;
  q?: string;
  page?: number;
  limit?: number;
};

/**
 * Browse one year/community's closing marks, sorted high to low. Each row
 * carries that programme's six-year mark history for the same community.
 */
export async function getCutoffExplorer(
  params: CutoffExplorerParams,
): Promise<CutoffExplorerResult> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(Math.max(Math.floor(params.limit ?? 25), 1), 100);
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [
    eq(cutoffs.year, params.year),
    eq(cutoffs.community, params.community),
    isNotNull(cutoffs.cutoffMark),
  ];

  if (params.branch) {
    conditions.push(eq(collegeBranches.branchCode, params.branch));
  }
  if (params.district) {
    conditions.push(eq(colleges.district, params.district));
  }
  if (params.q?.trim()) {
    const pattern = `%${params.q.trim()}%`;
    conditions.push(
      or(
        like(colleges.name, pattern),
        like(colleges.shortName, pattern),
        like(colleges.code, `${params.q.trim()}%`),
      )!,
    );
  }

  const where = and(...conditions);

  const rowsQuery = db
    .select({
      collegeBranchId: collegeBranches.id,
      collegeCode: colleges.code,
      collegeName: colleges.name,
      collegeShortName: colleges.shortName,
      district: colleges.district,
      type: colleges.type,
      branchCode: collegeBranches.branchCode,
      branchName: collegeBranches.branchName,
      mark: cutoffs.cutoffMark,
      rank: cutoffs.generalRank,
    })
    .from(cutoffs)
    .innerJoin(
      collegeBranches,
      eq(cutoffs.collegeBranchId, collegeBranches.id),
    )
    .innerJoin(colleges, eq(collegeBranches.collegeCode, colleges.code))
    .where(where)
    .orderBy(desc(cutoffs.cutoffMark), asc(colleges.name))
    .limit(limit)
    .offset(offset);

  const summaryQuery = db
    .select({
      highest: max(cutoffs.cutoffMark),
      average: avg(cutoffs.cutoffMark),
      programmes: countDistinct(collegeBranches.id),
    })
    .from(cutoffs)
    .innerJoin(
      collegeBranches,
      eq(cutoffs.collegeBranchId, collegeBranches.id),
    )
    .innerJoin(colleges, eq(collegeBranches.collegeCode, colleges.code))
    .where(where);

  const countQuery = db
    .select({ value: count() })
    .from(cutoffs)
    .innerJoin(
      collegeBranches,
      eq(cutoffs.collegeBranchId, collegeBranches.id),
    )
    .innerJoin(colleges, eq(collegeBranches.collegeCode, colleges.code))
    .where(where);

  const [rows, summaryRows, totalRows] = await Promise.all([
    rowsQuery,
    summaryQuery,
    countQuery,
  ]);

  const ids = rows.map((row) => row.collegeBranchId);
  const historyRows =
    ids.length > 0
      ? await db
          .select({
            collegeBranchId: cutoffs.collegeBranchId,
            year: cutoffs.year,
            cutoffMark: cutoffs.cutoffMark,
          })
          .from(cutoffs)
          .where(
            and(
              inArray(cutoffs.collegeBranchId, ids),
              eq(cutoffs.community, params.community),
              gte(cutoffs.year, 2020),
            ),
          )
      : [];

  const histories = new Map<number, (number | null)[]>();
  for (const id of ids) histories.set(id, Array(6).fill(null));
  for (const row of historyRows) {
    const history = histories.get(row.collegeBranchId);
    if (!history) continue;
    const index = row.year - 2020;
    if (index >= 0 && index < history.length) {
      history[index] = row.cutoffMark;
    }
  }

  const total = totalRows[0]?.value ?? 0;
  const summary = summaryRows[0];

  return {
    rows: rows.map((row) => ({
      ...row,
      history: histories.get(row.collegeBranchId) ?? Array(6).fill(null),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      highest: summary?.highest ?? null,
      average:
        summary?.average === null || summary?.average === undefined
          ? null
          : Number(summary.average),
      programmes: summary?.programmes ?? 0,
    },
  };
}

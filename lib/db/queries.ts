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
  roundCutoffs,
  seatMatrix,
  sourceDocuments,
  vacancies,
  type College,
  type Fee,
  type Hostel,
  type SourceDocument,
} from "@/lib/db/schema";
import { CUTOFF_YEARS, type Community } from "@/lib/tnea";

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
  roundCutoffs: number;
  vacancies: number;
  sourceDocuments: number;
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

export type CollegeOption = {
  code: string;
  name: string;
  shortName: string | null;
  district: string | null;
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
    roundCutoffs: seedManifest.counts.roundCutoffs,
    vacancies: seedManifest.counts.vacancies,
    sourceDocuments: seedManifest.counts.sourceDocuments,
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
      roundCutoffCount,
      vacancyCount,
      sourceDocumentCount,
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
      db.select({ value: count() }).from(roundCutoffs),
      db.select({ value: count() }).from(vacancies),
      db.select({ value: count() }).from(sourceDocuments),
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
      roundCutoffs: roundCutoffCount[0]?.value ?? 0,
      vacancies: vacancyCount[0]?.value ?? 0,
      sourceDocuments: sourceDocumentCount[0]?.value ?? 0,
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
 * A compact college list for the assistant picker. It is a lookup list, not a
 * ranking: the order is the official TNEA code.
 */
export async function getCollegeOptions(): Promise<CollegeOption[]> {
  return db
    .select({
      code: colleges.code,
      name: colleges.name,
      shortName: colleges.shortName,
      district: colleges.district,
    })
    .from(colleges)
    .orderBy(asc(colleges.code));
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
  rankSuffix: string | null;
  sourceRound: number | null;
  sourcePage: number | null;
};

export type RoundClose = {
  round: number;
  mark: number | null;
  rank: number | null;
  rankSuffix: string | null;
  /** Round in which the last-ranked candidate was actually allotted. */
  sourceRound: number | null;
  sourcePage: number | null;
};

export type SeatSummary = {
  totalSeats: number;
  allotted: number | null;
  vacant: number | null;
};

export type CollegeProfileBranch = {
  id: number;
  branchCode: string;
  branchName: string;
  approvedIntake: number | null;
  yearStarted: number | null;
  nba: boolean | null;
  nbaValidUpto: number | null;
  /** 2025 seat row, kept as `seats` for older callers. */
  seats: SeatSummary | null;
  seats2025: SeatSummary | null;
  seats2026: SeatSummary | null;
  vacancies2026: number | null;
  cutoffs2025: Partial<Record<Community, CommunityCutoff>>;
  cutoffs2026: Partial<Record<Community, CommunityCutoff>>;
  /** Cumulative close after each 2026 round, grouped by allotted community. */
  rounds2026: Partial<Record<Community, RoundClose[]>>;
  ocHistory: Partial<Record<number, number | null>>;
};

export type CollegeProfile = {
  college: College;
  hostel: Hostel | null;
  fees: Fee | null;
  branches: CollegeProfileBranch[];
  totals: {
    branches: number;
    seatRows: number;
    seats2025: number;
    allotted2025: number;
    vacant2025: number;
    seatRows2026: number;
    seats2026: number;
    vacancies2026: number;
  };
};

/**
 * A college profile with 2026 and 2025 closes, both seat years and the
 * per-round 2026 timeline. Every 2026 value keeps its source page and round.
 */
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
    })
    .from(collegeBranches)
    .where(eq(collegeBranches.collegeCode, code))
    .orderBy(asc(collegeBranches.branchName), asc(collegeBranches.branchCode));

  const ids = branchRows.map((row) => row.id);
  const [cutoffRows, roundRows, seatRows, vacancyRows] =
    ids.length > 0
      ? await Promise.all([
          db
            .select({
              collegeBranchId: cutoffs.collegeBranchId,
              year: cutoffs.year,
              community: cutoffs.community,
              cutoffMark: cutoffs.cutoffMark,
              generalRank: cutoffs.generalRank,
              rankSuffix: cutoffs.rankSuffix,
              sourceRound: cutoffs.sourceRound,
              sourcePage: cutoffs.sourcePage,
            })
            .from(cutoffs)
            .where(
              and(
                inArray(cutoffs.collegeBranchId, ids),
                gte(cutoffs.year, 2020),
              ),
            ),
          db
            .select({
              collegeBranchId: roundCutoffs.collegeBranchId,
              community: roundCutoffs.community,
              round: roundCutoffs.round,
              cutoffMark: roundCutoffs.cutoffMark,
              generalRank: roundCutoffs.generalRank,
              rankSuffix: roundCutoffs.rankSuffix,
              sourceRound: roundCutoffs.sourceRound,
              sourcePage: roundCutoffs.sourcePage,
            })
            .from(roundCutoffs)
            .where(
              and(
                inArray(roundCutoffs.collegeBranchId, ids),
                eq(roundCutoffs.year, 2026),
              ),
            )
            .orderBy(asc(roundCutoffs.round)),
          db
            .select({
              collegeBranchId: seatMatrix.collegeBranchId,
              year: seatMatrix.year,
              totalSeats: seatMatrix.totalSeats,
              allotted: seatMatrix.allotted,
              vacant: seatMatrix.vacant,
            })
            .from(seatMatrix)
            .where(
              and(
                inArray(seatMatrix.collegeBranchId, ids),
                inArray(seatMatrix.year, [2025, 2026]),
              ),
            ),
          db
            .select({
              collegeBranchId: vacancies.collegeBranchId,
              vacantSeats: vacancies.vacantSeats,
            })
            .from(vacancies)
            .where(
              and(
                inArray(vacancies.collegeBranchId, ids),
                eq(vacancies.year, 2026),
              ),
            ),
        ])
      : [[], [], [], []];

  const byBranch = new Map<
    number,
    {
      seats2025: SeatSummary | null;
      seats2026: SeatSummary | null;
      vacancies2026: number | null;
      cutoffs2025: Partial<Record<Community, CommunityCutoff>>;
      cutoffs2026: Partial<Record<Community, CommunityCutoff>>;
      rounds2026: Partial<Record<Community, RoundClose[]>>;
      ocHistory: Partial<Record<number, number | null>>;
    }
  >();

  for (const row of branchRows) {
    byBranch.set(row.id, {
      seats2025: null,
      seats2026: null,
      vacancies2026: null,
      cutoffs2025: {},
      cutoffs2026: {},
      rounds2026: {},
      ocHistory: {},
    });
  }

  for (const row of cutoffRows) {
    const entry = byBranch.get(row.collegeBranchId);
    if (!entry) continue;

    const value: CommunityCutoff = {
      mark: row.cutoffMark,
      rank: row.generalRank,
      rankSuffix: row.rankSuffix,
      sourceRound: row.sourceRound,
      sourcePage: row.sourcePage,
    };
    if (row.year === 2025) {
      entry.cutoffs2025[row.community as Community] = value;
    } else if (row.year === 2026) {
      entry.cutoffs2026[row.community as Community] = value;
    }
    if (row.community === "OC") {
      entry.ocHistory[row.year] = row.cutoffMark;
    }
  }

  for (const row of roundRows) {
    const entry = byBranch.get(row.collegeBranchId);
    if (!entry) continue;
    const community = row.community as Community;
    const list = entry.rounds2026[community] ?? [];
    list.push({
      round: row.round,
      mark: row.cutoffMark,
      rank: row.generalRank,
      rankSuffix: row.rankSuffix,
      sourceRound: row.sourceRound,
      sourcePage: row.sourcePage,
    });
    entry.rounds2026[community] = list;
  }

  for (const row of seatRows) {
    const entry = byBranch.get(row.collegeBranchId);
    if (!entry) continue;
    const summary: SeatSummary = {
      totalSeats: row.totalSeats,
      allotted: row.allotted,
      vacant: row.vacant,
    };
    if (row.year === 2025) entry.seats2025 = summary;
    if (row.year === 2026) entry.seats2026 = summary;
  }

  for (const row of vacancyRows) {
    const entry = byBranch.get(row.collegeBranchId);
    if (!entry) continue;
    entry.vacancies2026 = (entry.vacancies2026 ?? 0) + row.vacantSeats;
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
      seats: entry?.seats2025 ?? null,
      seats2025: entry?.seats2025 ?? null,
      seats2026: entry?.seats2026 ?? null,
      vacancies2026: entry?.vacancies2026 ?? null,
      cutoffs2025: entry?.cutoffs2025 ?? {},
      cutoffs2026: entry?.cutoffs2026 ?? {},
      rounds2026: entry?.rounds2026 ?? {},
      ocHistory: entry?.ocHistory ?? {},
    };
  });

  const seats2025 = profileBranches
    .map((branch) => branch.seats2025)
    .filter((row): row is SeatSummary => row !== null);
  const seats2026 = profileBranches
    .map((branch) => branch.seats2026)
    .filter((row): row is SeatSummary => row !== null);

  return {
    ...collegeData,
    branches: profileBranches,
    totals: {
      branches: profileBranches.length,
      seatRows: seats2025.length,
      seats2025: seats2025.reduce((sum, row) => sum + row.totalSeats, 0),
      allotted2025: seats2025.reduce(
        (sum, row) => sum + (row.allotted ?? 0),
        0,
      ),
      vacant2025: seats2025.reduce((sum, row) => sum + (row.vacant ?? 0), 0),
      seatRows2026: seats2026.length,
      seats2026: seats2026.reduce((sum, row) => sum + row.totalSeats, 0),
      vacancies2026: profileBranches.reduce(
        (sum, row) => sum + (row.vacancies2026 ?? 0),
        0,
      ),
    },
  };
}

export type CutoffRound = {
  round: number;
  mark: number | null;
  rank: number | null;
  sourceRound: number | null;
  sourcePage: number | null;
};

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
  sourceRound: number | null;
  sourcePage: number | null;
  history: (number | null)[];
  rounds: CutoffRound[];
};

export type CutoffExplorerResult = {
  rows: CutoffExplorerRow[];
  total: number;
  page: number;
  pages: number;
  /** 2026 groups the close by the community the seat was allotted against. */
  communityBasis: "candidate" | "allotted";
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
 * carries that programme's mark history for the same community. For 2026 the
 * rows also carry the cumulative R1–R3 close, which is the only honest
 * year-on-year comparison for the allotted-community grouping.
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
      sourceRound: cutoffs.sourceRound,
      sourcePage: cutoffs.sourcePage,
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
  const [historyRows, roundRows] = await Promise.all([
    ids.length > 0
      ? db
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
              gte(cutoffs.year, CUTOFF_YEARS[0]),
              // 2026 is grouped by allotted community, so it is never drawn
              // on the candidate-community year line.
              params.year === 2026
                ? eq(cutoffs.year, 2026)
                : sql`${cutoffs.year} < 2026`,
            ),
          )
      : Promise.resolve([]),
    ids.length > 0 && params.year === 2026
      ? db
          .select({
            collegeBranchId: roundCutoffs.collegeBranchId,
            round: roundCutoffs.round,
            cutoffMark: roundCutoffs.cutoffMark,
            generalRank: roundCutoffs.generalRank,
            sourceRound: roundCutoffs.sourceRound,
            sourcePage: roundCutoffs.sourcePage,
          })
          .from(roundCutoffs)
          .where(
            and(
              inArray(roundCutoffs.collegeBranchId, ids),
              eq(roundCutoffs.year, 2026),
              eq(roundCutoffs.community, params.community),
            ),
          )
          .orderBy(asc(roundCutoffs.round))
      : Promise.resolve([]),
  ]);

  const histories = new Map<number, (number | null)[]>();
  for (const id of ids) histories.set(id, Array(CUTOFF_YEARS.length).fill(null));
  for (const row of historyRows) {
    const history = histories.get(row.collegeBranchId);
    if (!history) continue;
    const index = row.year - CUTOFF_YEARS[0];
    if (index >= 0 && index < history.length) {
      history[index] = row.cutoffMark;
    }
  }

  const roundsByBranch = new Map<number, CutoffRound[]>();
  for (const row of roundRows) {
    const list = roundsByBranch.get(row.collegeBranchId) ?? [];
    list.push({
      round: row.round,
      mark: row.cutoffMark,
      rank: row.generalRank,
      sourceRound: row.sourceRound,
      sourcePage: row.sourcePage,
    });
    roundsByBranch.set(row.collegeBranchId, list);
  }

  const total = totalRows[0]?.value ?? 0;
  const summary = summaryRows[0];

  return {
    rows: rows.map((row) => ({
      ...row,
      history:
        histories.get(row.collegeBranchId) ??
        Array(CUTOFF_YEARS.length).fill(null),
      rounds: roundsByBranch.get(row.collegeBranchId) ?? [],
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    communityBasis: params.year === 2026 ? "allotted" : "candidate",
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

export type PredictorCandidate = {
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
  sourceRound: number | null;
  sourcePage: number | null;
};

/**
 * Every programme result for one community and comparison year, optionally
 * narrowed to a branch or district. The position bands are applied in the UI
 * layer. The 2026 close is grouped by the community the seat was allotted
 * against, so it must never be described as a candidate-community cutoff.
 */
export async function getPredictorCandidates(params: {
  community: Community;
  branch?: string;
  district?: string;
  year?: number;
}): Promise<PredictorCandidate[]> {
  const conditions: SQL[] = [
    eq(cutoffs.year, params.year ?? 2026),
    eq(cutoffs.community, params.community),
    isNotNull(cutoffs.cutoffMark),
    isNotNull(cutoffs.generalRank),
  ];

  if (params.branch) {
    conditions.push(eq(collegeBranches.branchCode, params.branch));
  }
  if (params.district) {
    conditions.push(eq(colleges.district, params.district));
  }

  return db
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
      sourceRound: cutoffs.sourceRound,
      sourcePage: cutoffs.sourcePage,
    })
    .from(cutoffs)
    .innerJoin(
      collegeBranches,
      eq(cutoffs.collegeBranchId, collegeBranches.id),
    )
    .innerJoin(colleges, eq(collegeBranches.collegeCode, colleges.code))
    .where(and(...conditions))
    .orderBy(desc(cutoffs.cutoffMark), asc(cutoffs.generalRank))
    .limit(5000);
}

export type CompareSuggestion = {
  code: string;
  name: string;
  shortName: string | null;
  district: string | null;
  branchCount: number;
};

/**
 * A few colleges with broad programme catalogues, offered as starting points
 * on the empty compare screen. This is a dataset ordering, not a ranking.
 */
export async function getCompareSuggestions(
  limit = 6,
): Promise<CompareSuggestion[]> {
  const branchCount = sql<number>`(
    select count(*) from ${collegeBranches}
    where ${collegeBranches.collegeCode} = ${colleges.code}
  )`;

  return db
    .select({
      code: colleges.code,
      name: colleges.name,
      shortName: colleges.shortName,
      district: colleges.district,
      branchCount,
    })
    .from(colleges)
    .where(isNotNull(colleges.shortName))
    .orderBy(desc(branchCount), asc(colleges.code))
    .limit(Math.min(Math.max(Math.floor(limit), 1), 12));
}

/**
 * The official documents that every 2026 public fact points back to. Ordered
 * by round, then by document type, so the provenance page reads like a ledger.
 */
export async function getSourceDocuments(): Promise<SourceDocument[]> {
  return db
    .select()
    .from(sourceDocuments)
    .orderBy(
      asc(sourceDocuments.year),
      asc(sourceDocuments.round),
      asc(sourceDocuments.documentType),
    );
}

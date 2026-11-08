import "server-only";

import { and, asc, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  branches,
  collegeBranches,
  colleges,
  cutoffs,
  roundCutoffs,
  seatMatrix,
  sourceDocuments,
  vacancies,
} from "@/lib/db/schema";
import { getCollegeProfile } from "@/lib/db/queries";

export type CollegeRef = {
  code: string;
  name: string;
  shortName: string | null;
  district: string | null;
  type: string;
  autonomous: boolean | null;
};

export type BranchRef = {
  code: string;
  name: string;
};

export type CutoffRow = {
  collegeCode: string;
  collegeName: string;
  collegeShortName: string | null;
  district: string | null;
  branchCode: string;
  branchName: string;
  community: string;
  year: number;
  mark: number | null;
  rank: number | null;
  rankSuffix: string | null;
  sourceRound: number | null;
  sourcePage: number | null;
  sourceDocumentId: string | null;
};

export type TimelineRow = {
  year: number;
  branchCode: string;
  branchName: string;
  community: string;
  round: number;
  mark: number | null;
  rank: number | null;
  rankSuffix: string | null;
  sourceRound: number | null;
  sourcePage: number | null;
  sourceDocumentId: string | null;
};

export type SeatRow = {
  branchCode: string;
  branchName: string;
  totalSeats: number;
  allotted: number | null;
  vacant: number | null;
};

export type VacancyLeaderRow = {
  collegeCode: string;
  collegeName: string;
  district: string | null;
  vacantSeats: number;
};

export type SourceDocumentRow = {
  id: string;
  authority: string;
  title: string;
  url: string;
  sha256: string;
  pageCount: number;
  documentType: string;
  year: number;
  round: number | null;
};

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "at",
  "on",
  "for",
  "to",
  "from",
  "is",
  "was",
  "were",
  "are",
  "be",
  "been",
  "what",
  "which",
  "who",
  "how",
  "many",
  "much",
  "show",
  "tell",
  "me",
  "about",
  "please",
  "can",
  "could",
  "would",
  "should",
  "i",
  "my",
  "we",
  "our",
  "you",
  "your",
  "college",
  "colleges",
  "cutoff",
  "cutoffs",
  "cut",
  "off",
  "closing",
  "close",
  "closes",
  "closed",
  "mark",
  "marks",
  "rank",
  "ranks",
  "seat",
  "seats",
  "vacancy",
  "vacancies",
  "round",
  "rounds",
  "year",
  "community",
  "data",
  "dataset",
  "tnea",
  "pdf",
  "page",
  "source",
  "document",
  "give",
  "list",
  "compare",
  "between",
  "vs",
  "versus",
  "did",
  "does",
  "do",
  "get",
  "got",
  "all",
  "any",
  "there",
  "their",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "as",
  "by",
  "with",
  "after",
  "before",
  "latest",
  "last",
  "most",
  "more",
  "less",
  "had",
  "has",
  "have",
  "with",
  "where",
  "which",
  "whose",
  "highest",
  "lowest",
  "top",
]);

const BRANCH_ALIASES: { phrase: string; code: string }[] = [
  { phrase: "artificial intelligence and data science", code: "AD" },
  { phrase: "artificial intelligence and machine learning", code: "AM" },
  { phrase: "computer science and engineering", code: "CS" },
  { phrase: "information technology", code: "IT" },
  { phrase: "electronics and communication", code: "EC" },
  { phrase: "electrical and electronics", code: "EE" },
  { phrase: "artificial intelligence", code: "AI" },
  { phrase: "machine learning", code: "AM" },
  { phrase: "data science", code: "AD" },
  { phrase: "cyber security", code: "CY" },
  { phrase: "mechanical engineering", code: "ME" },
  { phrase: "civil engineering", code: "CE" },
  { phrase: "computer science", code: "CS" },
  { phrase: "mechanical", code: "ME" },
  { phrase: "civil", code: "CE" },
  { phrase: "cse", code: "CS" },
  { phrase: "ece", code: "EC" },
  { phrase: "eee", code: "EE" },
  { phrase: "mech", code: "ME" },
  { phrase: "aiml", code: "AM" },
  { phrase: "aids", code: "AD" },
];

const CODE_ALIASES = new Map<string, string>([
  ["CSE", "CS"],
  ["ECE", "EC"],
  ["EEE", "EE"],
  ["MECH", "ME"],
  ["CIVIL", "CE"],
  ["AIML", "AM"],
  ["AIDS", "AD"],
]);

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export async function resolveCollege(
  question: string,
  explicitCode?: string | null,
): Promise<CollegeRef | null> {
  const codeCandidates = new Set<string>();
  if (explicitCode && /^\d{1,4}$/.test(explicitCode.trim())) {
    codeCandidates.add(explicitCode.trim().padStart(4, "0"));
  }
  for (const match of question.matchAll(/\b(\d{4})\b/g)) {
    codeCandidates.add(match[1]);
  }

  for (const code of codeCandidates) {
    const [row] = await db
      .select({
        code: colleges.code,
        name: colleges.name,
        shortName: colleges.shortName,
        district: colleges.district,
        type: colleges.type,
        autonomous: colleges.autonomous,
      })
      .from(colleges)
      .where(eq(colleges.code, code))
      .limit(1);
    if (row) return row;
  }

  const lower = normalise(question);
  const tokens = lower
    .split(" ")
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token) && !/^\d+$/.test(token));
  if (tokens.length === 0) return null;

  const conditions = tokens.flatMap((token) => [
    like(sql`lower(${colleges.name})`, `%${token}%`),
    like(sql`lower(coalesce(${colleges.shortName}, ''))`, `%${token}%`),
  ]);

  const rows = await db
    .select({
      code: colleges.code,
      name: colleges.name,
      shortName: colleges.shortName,
      district: colleges.district,
      type: colleges.type,
      autonomous: colleges.autonomous,
    })
    .from(colleges)
    .where(or(...conditions))
    .limit(80);

  if (rows.length === 0) return null;

  const upperTokens = new Set(
    (question.match(/\b[A-Z][A-Z0-9&.]{1,7}\b/g) ?? []).map((token) =>
      token.replace(/[^A-Z0-9]/g, ""),
    ),
  );

  const scored = rows.map((row) => {
    const name = row.name.toLowerCase();
    const shortName = (row.shortName ?? "").toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (name.includes(token)) score += token.length + 2;
      if (shortName.includes(token)) score += token.length * 2 + 4;
    }
    for (const token of upperTokens) {
      if (token.length >= 2 && shortName.includes(token.toLowerCase())) score += 20;
    }
    return { row, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].row : null;
}

export async function resolveBranch(question: string): Promise<BranchRef | null> {
  const lower = normalise(question);
  const rows = await db.select().from(branches).orderBy(asc(branches.code));

  const byName = rows
    .map((row) => ({ row, normalised: normalise(row.name) }))
    .filter(({ normalised }) => normalised.length > 4 && lower.includes(normalised))
    .sort((a, b) => b.normalised.length - a.normalised.length)[0];
  if (byName) return { code: byName.row.code, name: byName.row.name };

  const aliases = [...BRANCH_ALIASES].sort(
    (a, b) => b.phrase.length - a.phrase.length,
  );
  for (const alias of aliases) {
    if (lower.includes(alias.phrase)) {
      const branch = rows.find((row) => row.code === alias.code);
      if (branch) return { code: branch.code, name: branch.name };
    }
  }

  const upperTokens = question.match(/\b[A-Z]{2,4}\b/g) ?? [];
  for (const token of upperTokens) {
    const mapped = CODE_ALIASES.get(token) ?? token;
    if (["OC", "BC", "BCM", "MBC", "SC", "SCA", "ST", "TNEA", "PDF"].includes(mapped)) {
      continue;
    }
    const branch = rows.find((row) => row.code === mapped);
    if (branch) return { code: branch.code, name: branch.name };
  }

  return null;
}

export async function resolveDistrict(question: string): Promise<string | null> {
  const rows = await db
    .selectDistinct({ district: colleges.district })
    .from(colleges)
    .where(sql`${colleges.district} is not null`);
  const lower = normalise(question);
  const match = rows
    .map((row) => row.district)
    .filter((district): district is string => Boolean(district))
    .sort((a, b) => b.length - a.length)
    .find((district) => lower.includes(normalise(district)));
  return match ?? null;
}

export async function getCutoffRows(params: {
  collegeCode: string;
  branchCode?: string | null;
  year: number;
  community?: string | null;
}): Promise<CutoffRow[]> {
  const conditions: SQL[] = [
    eq(cutoffs.year, params.year),
    eq(colleges.code, params.collegeCode),
  ];
  if (params.branchCode) {
    conditions.push(eq(collegeBranches.branchCode, params.branchCode));
  }
  if (params.community) {
    conditions.push(eq(cutoffs.community, params.community));
  }

  return db
    .select({
      collegeCode: colleges.code,
      collegeName: colleges.name,
      collegeShortName: colleges.shortName,
      district: colleges.district,
      branchCode: collegeBranches.branchCode,
      branchName: collegeBranches.branchName,
      community: cutoffs.community,
      year: cutoffs.year,
      mark: cutoffs.cutoffMark,
      rank: cutoffs.generalRank,
      rankSuffix: cutoffs.rankSuffix,
      sourceRound: cutoffs.sourceRound,
      sourcePage: cutoffs.sourcePage,
      sourceDocumentId: cutoffs.sourceDocumentId,
    })
    .from(cutoffs)
    .innerJoin(
      collegeBranches,
      eq(cutoffs.collegeBranchId, collegeBranches.id),
    )
    .innerJoin(colleges, eq(collegeBranches.collegeCode, colleges.code))
    .where(and(...conditions))
    .orderBy(asc(collegeBranches.branchName), asc(cutoffs.community))
    .limit(80);
}

export async function getTimelineRows(params: {
  collegeCode: string;
  branchCode?: string | null;
  community: string;
  year: number;
}): Promise<TimelineRow[]> {
  const conditions: SQL[] = [
    eq(roundCutoffs.year, params.year),
    eq(colleges.code, params.collegeCode),
    eq(roundCutoffs.community, params.community),
  ];
  if (params.branchCode) {
    conditions.push(eq(collegeBranches.branchCode, params.branchCode));
  }

  return db
    .select({
      year: roundCutoffs.year,
      branchCode: collegeBranches.branchCode,
      branchName: collegeBranches.branchName,
      community: roundCutoffs.community,
      round: roundCutoffs.round,
      mark: roundCutoffs.cutoffMark,
      rank: roundCutoffs.generalRank,
      rankSuffix: roundCutoffs.rankSuffix,
      sourceRound: roundCutoffs.sourceRound,
      sourcePage: roundCutoffs.sourcePage,
      sourceDocumentId: roundCutoffs.sourceDocumentId,
    })
    .from(roundCutoffs)
    .innerJoin(
      collegeBranches,
      eq(roundCutoffs.collegeBranchId, collegeBranches.id),
    )
    .innerJoin(colleges, eq(collegeBranches.collegeCode, colleges.code))
    .where(and(...conditions))
    .orderBy(asc(collegeBranches.branchName), asc(roundCutoffs.round))
    .limit(120);
}

export async function getSeatRows(params: {
  collegeCode: string;
  branchCode?: string | null;
  year: number;
}): Promise<SeatRow[]> {
  const conditions: SQL[] = [
    eq(seatMatrix.year, params.year),
    eq(colleges.code, params.collegeCode),
  ];
  if (params.branchCode) {
    conditions.push(eq(collegeBranches.branchCode, params.branchCode));
  }

  return db
    .select({
      branchCode: collegeBranches.branchCode,
      branchName: collegeBranches.branchName,
      totalSeats: seatMatrix.totalSeats,
      allotted: seatMatrix.allotted,
      vacant: seatMatrix.vacant,
    })
    .from(seatMatrix)
    .innerJoin(
      collegeBranches,
      eq(seatMatrix.collegeBranchId, collegeBranches.id),
    )
    .innerJoin(colleges, eq(collegeBranches.collegeCode, colleges.code))
    .where(and(...conditions))
    .orderBy(asc(collegeBranches.branchName))
    .limit(120);
}

export async function getVacancyLeaderboard(params: {
  branchCode?: string | null;
  district?: string | null;
  limit?: number;
}): Promise<VacancyLeaderRow[]> {
  const conditions: SQL[] = [eq(vacancies.year, 2026)];
  if (params.branchCode) {
    conditions.push(eq(collegeBranches.branchCode, params.branchCode));
  }
  if (params.district) {
    conditions.push(eq(colleges.district, params.district));
  }

  const rows = await db
    .select({
      collegeCode: colleges.code,
      collegeName: colleges.name,
      district: colleges.district,
      vacantSeats: sql<number>`sum(${vacancies.vacantSeats})`,
    })
    .from(vacancies)
    .innerJoin(
      collegeBranches,
      eq(vacancies.collegeBranchId, collegeBranches.id),
    )
    .innerJoin(colleges, eq(collegeBranches.collegeCode, colleges.code))
    .where(and(...conditions))
    .groupBy(colleges.code, colleges.name, colleges.district)
    .orderBy(desc(sql`sum(${vacancies.vacantSeats})`))
    .limit(params.limit ?? 10);

  return rows.map((row) => ({
    ...row,
    vacantSeats: Number(row.vacantSeats ?? 0),
  }));
}

export async function getSourceMap(): Promise<Map<string, SourceDocumentRow>> {
  const rows = await db
    .select({
      id: sourceDocuments.id,
      authority: sourceDocuments.authority,
      title: sourceDocuments.title,
      url: sourceDocuments.url,
      sha256: sourceDocuments.sha256,
      pageCount: sourceDocuments.pageCount,
      documentType: sourceDocuments.documentType,
      year: sourceDocuments.year,
      round: sourceDocuments.round,
    })
    .from(sourceDocuments)
    .orderBy(asc(sourceDocuments.year), asc(sourceDocuments.round));

  return new Map(rows.map((row) => [row.id, row]));
}

export async function getSources(): Promise<SourceDocumentRow[]> {
  return db
    .select({
      id: sourceDocuments.id,
      authority: sourceDocuments.authority,
      title: sourceDocuments.title,
      url: sourceDocuments.url,
      sha256: sourceDocuments.sha256,
      pageCount: sourceDocuments.pageCount,
      documentType: sourceDocuments.documentType,
      year: sourceDocuments.year,
      round: sourceDocuments.round,
    })
    .from(sourceDocuments)
    .orderBy(
      asc(sourceDocuments.year),
      asc(sourceDocuments.round),
      asc(sourceDocuments.documentType),
    );
}

export async function getCollegeProgrammes(code: string) {
  return getCollegeProfile(code);
}

export async function getProgrammeSeatsAndVacancies(
  code: string,
): Promise<SeatRow[]> {
  const rows = await db
    .select({
      branchCode: collegeBranches.branchCode,
      branchName: collegeBranches.branchName,
      totalSeats: seatMatrix.totalSeats,
      allotted: seatMatrix.allotted,
      vacant: seatMatrix.vacant,
    })
    .from(seatMatrix)
    .innerJoin(
      collegeBranches,
      eq(seatMatrix.collegeBranchId, collegeBranches.id),
    )
    .where(
      and(eq(seatMatrix.year, 2026), eq(collegeBranches.collegeCode, code)),
    )
    .orderBy(asc(collegeBranches.branchName));

  const vacancyRows = await db
    .select({
      collegeBranchId: vacancies.collegeBranchId,
      vacantSeats: vacancies.vacantSeats,
    })
    .from(vacancies)
    .innerJoin(
      collegeBranches,
      eq(vacancies.collegeBranchId, collegeBranches.id),
    )
    .where(
      and(eq(vacancies.year, 2026), eq(collegeBranches.collegeCode, code)),
    );

  const vacancyByBranch = new Map<number, number>();
  for (const row of vacancyRows) {
    vacancyByBranch.set(
      row.collegeBranchId,
      (vacancyByBranch.get(row.collegeBranchId) ?? 0) + row.vacantSeats,
    );
  }

  const branchIds = await db
    .select({
      id: collegeBranches.id,
      branchCode: collegeBranches.branchCode,
      branchName: collegeBranches.branchName,
    })
    .from(collegeBranches)
    .where(eq(collegeBranches.collegeCode, code));
  const idByBranch = new Map(
    branchIds.map((row) => [`${row.branchCode}:${row.branchName}`, row.id]),
  );

  return rows.map((row) => ({
    ...row,
    vacant:
      vacancyByBranch.get(
        idByBranch.get(`${row.branchCode}:${row.branchName}`) ?? -1,
      ) ?? null,
  }));
}

export async function getCollegeBranchMaster(): Promise<
  { collegeCode: string; branchCode: string; branchName: string }[]
> {
  return db
    .select({
      collegeCode: collegeBranches.collegeCode,
      branchCode: collegeBranches.branchCode,
      branchName: collegeBranches.branchName,
    })
    .from(collegeBranches);
}

export async function getDocumentsForIds(
  ids: (string | null)[],
): Promise<Map<string, SourceDocumentRow>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({
      id: sourceDocuments.id,
      authority: sourceDocuments.authority,
      title: sourceDocuments.title,
      url: sourceDocuments.url,
      sha256: sourceDocuments.sha256,
      pageCount: sourceDocuments.pageCount,
      documentType: sourceDocuments.documentType,
      year: sourceDocuments.year,
      round: sourceDocuments.round,
    })
    .from(sourceDocuments)
    .where(inArray(sourceDocuments.id, unique));

  return new Map(rows.map((row) => [row.id, row]));
}

export async function findBranchByCode(code: string): Promise<BranchRef | null> {
  const [row] = await db
    .select({ code: branches.code, name: branches.name })
    .from(branches)
    .where(eq(branches.code, code.toUpperCase()))
    .limit(1);
  return row ?? null;
}

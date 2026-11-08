import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

const SEED_DIR = join(process.cwd(), "data", "seed");

type College = {
  code: string;
  name: string;
  district: string | null;
  type: string;
  sourceDocumentId?: string | null;
};

type Branch = { code: string; name: string };

type CollegeBranch = {
  id: number;
  collegeCode: string;
  branchCode: string;
  branchName: string;
};

type Cutoff = {
  collegeBranchId: number;
  year: number;
  community: string;
  cutoffMark: number | null;
  generalRank: number | null;
  rankSuffix?: string | null;
  sourceDocumentId?: string | null;
  sourcePage?: number | null;
  sourceRound?: number | null;
};

type RoundCutoff = Cutoff & { round: number };

type Seat = { collegeBranchId: number; year: number };
type Vacancy = {
  collegeBranchId: number;
  year: number;
  community: string;
  vacantSeats: number;
  sourceDocumentId?: string | null;
  sourcePage?: number | null;
};

type SourceDocument = {
  id: string;
  sha256: string;
  documentType: string;
  year: number;
  status: string;
};

function readSeed<T>(name: string): T[] {
  const gz = readFileSync(join(SEED_DIR, `${name}.ndjson.gz`));
  return gunzipSync(gz)
    .toString("utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

const manifest = JSON.parse(
  readFileSync(join(SEED_DIR, "manifest.json"), "utf8"),
) as { counts: Record<string, number> };

const colleges = [
  ...readSeed<College>("colleges"),
  ...readSeed<College>("colleges_2026"),
];
const branches = [
  ...readSeed<Branch>("branches"),
  ...readSeed<Branch>("branches_2026"),
];
const collegeBranches = [
  ...readSeed<CollegeBranch>("college_branches"),
  ...readSeed<CollegeBranch>("college_branches_2026"),
];
const cutoffs = [
  ...readSeed<Cutoff>("cutoffs"),
  ...readSeed<Cutoff>("cutoffs_2026"),
];
const seats = [
  ...readSeed<Seat>("seat_matrix"),
  ...readSeed<Seat>("seat_matrix_2026"),
];
const roundCutoffs = readSeed<RoundCutoff>("round_cutoffs");
const vacancies = readSeed<Vacancy>("vacancies_2026");
const sourceDocuments = readSeed<SourceDocument>("source_documents");

describe("seed dataset", () => {
  it("matches the manifest counts", () => {
    expect(colleges).toHaveLength(manifest.counts.colleges);
    expect(branches).toHaveLength(manifest.counts.branches);
    expect(collegeBranches).toHaveLength(manifest.counts.collegeBranches);
    expect(cutoffs).toHaveLength(manifest.counts.cutoffs);
    expect(seats).toHaveLength(manifest.counts.seatMatrix);
    expect(roundCutoffs).toHaveLength(manifest.counts.roundCutoffs);
    expect(vacancies).toHaveLength(manifest.counts.vacancies);
    expect(sourceDocuments).toHaveLength(manifest.counts.sourceDocuments);
  });

  it("has unique college and branch codes", () => {
    expect(new Set(colleges.map((college) => college.code)).size).toBe(
      colleges.length,
    );
    expect(new Set(branches.map((branch) => branch.code)).size).toBe(
      branches.length,
    );
  });

  it("keeps one college-branch row per programme", () => {
    const keys = collegeBranches.map(
      (row) => `${row.collegeCode}/${row.branchCode}/${row.branchName}`,
    );
    expect(new Set(keys).size).toBe(keys.length);

    const duplicateCodes = new Map<string, number>();
    for (const row of collegeBranches) {
      const key = `${row.collegeCode}/${row.branchCode}`;
      duplicateCodes.set(key, (duplicateCodes.get(key) ?? 0) + 1);
    }
    const duplicates = [...duplicateCodes.entries()].filter(
      ([, count]) => count > 1,
    );
    expect(duplicates.map(([key]) => key)).toEqual(["1452/AM"]);
  });

  it("stores PERI's two AM programmes separately", () => {
    const peri = collegeBranches
      .filter((row) => row.collegeCode === "1452" && row.branchCode === "AM")
      .map((row) => row.branchName)
      .sort();
    expect(peri).toEqual([
      "Computer Science and Engineering (AI and Machine Learning)",
      "Computer Science and Engineering (Artificial Intelligence)",
    ]);
  });

  it("stores closing ranks for 2025 and 2026 only", () => {
    const yearsWithRanks = new Set(
      cutoffs
        .filter((row) => row.generalRank !== null)
        .map((row) => row.year),
    );
    expect([...yearsWithRanks].sort()).toEqual([2025, 2026]);

    const cutoff2025 = cutoffs.filter((row) => row.year === 2025);
    expect(cutoff2025.every((row) => row.generalRank !== null)).toBe(true);

    const cutoff2026 = cutoffs.filter((row) => row.year === 2026);
    expect(cutoff2026.every((row) => row.generalRank !== null)).toBe(true);
  });

  it("attaches a document, page and round to every 2026 close", () => {
    const missing = cutoffs.filter(
      (row) =>
        row.year === 2026 &&
        (!row.sourceDocumentId || !row.sourcePage || !row.sourceRound),
    );
    expect(missing).toEqual([]);
  });

  it("keeps marks in the TNEA cutoff range", () => {
    const invalid = cutoffs.filter(
      (row) =>
        row.cutoffMark !== null &&
        (row.cutoffMark < 0 || row.cutoffMark > 200),
    );
    expect(invalid).toEqual([]);
  });

  it("has unique cutoff, round and seat keys", () => {
    const cutoffKeys = cutoffs.map(
      (row) => `${row.collegeBranchId}/${row.year}/${row.community}`,
    );
    expect(new Set(cutoffKeys).size).toBe(cutoffKeys.length);

    const roundKeys = roundCutoffs.map(
      (row) =>
        `${row.collegeBranchId}/${row.year}/${row.community}/${row.round}`,
    );
    expect(new Set(roundKeys).size).toBe(roundKeys.length);

    const seatKeys = seats.map((row) => `${row.collegeBranchId}/${row.year}`);
    expect(new Set(seatKeys).size).toBe(seatKeys.length);

    const vacancyKeys = vacancies.map(
      (row) => `${row.collegeBranchId}/${row.year}/${row.community}`,
    );
    expect(new Set(vacancyKeys).size).toBe(vacancyKeys.length);
  });

  it("only references known colleges and programmes", () => {
    const collegeCodes = new Set(colleges.map((college) => college.code));
    const branchCodes = new Set(branches.map((branch) => branch.code));
    const collegeBranchIds = new Set(collegeBranches.map((row) => row.id));

    expect(
      collegeBranches.filter(
        (row) =>
          !collegeCodes.has(row.collegeCode) ||
          !branchCodes.has(row.branchCode),
      ),
    ).toEqual([]);
    expect(
      cutoffs.filter((row) => !collegeBranchIds.has(row.collegeBranchId)),
    ).toEqual([]);
    expect(
      roundCutoffs.filter((row) => !collegeBranchIds.has(row.collegeBranchId)),
    ).toEqual([]);
    expect(
      seats.filter((row) => !collegeBranchIds.has(row.collegeBranchId)),
    ).toEqual([]);
    expect(
      vacancies.filter((row) => !collegeBranchIds.has(row.collegeBranchId)),
    ).toEqual([]);
  });

  it("uses the official 2026 branch names for CA and AI", () => {
    const byCode = new Map(branches.map((branch) => [branch.code, branch.name]));
    expect(byCode.get("CA")).toBe(
      "Computer Science and Engineering (Artificial Intelligence)",
    );
    expect(byCode.get("AI")).toBe("Artificial Intelligence");
  });

  it("has verified source documents with hashes", () => {
    expect(sourceDocuments.map((doc) => doc.id).sort()).toEqual([
      "tnea-2026-allotment-r1",
      "tnea-2026-allotment-r2",
      "tnea-2026-allotment-r3",
      "tnea-2026-college-directory",
      "tnea-2026-seat-matrix",
      "tnea-2026-vacancy-r3",
    ]);
    expect(sourceDocuments.every((doc) => doc.sha256.length === 64)).toBe(true);
    expect(sourceDocuments.every((doc) => doc.status === "verified")).toBe(
      true,
    );
  });

  it("keeps 2026 round closes cumulative and monotonic", () => {
    const byKey = new Map<string, RoundCutoff[]>();
    for (const row of roundCutoffs) {
      const key = `${row.collegeBranchId}/${row.community}`;
      const list = byKey.get(key) ?? [];
      list.push(row);
      byKey.set(key, list);
    }

    for (const rows of byKey.values()) {
      rows.sort((a, b) => a.round - b.round);
      for (let index = 1; index < rows.length; index += 1) {
        expect(rows[index].generalRank!).toBeGreaterThanOrEqual(
          rows[index - 1].generalRank!,
        );
      }
    }

    // The stored final close must equal the cumulative Round 3 close.
    const round3 = new Map(
      roundCutoffs
        .filter((row) => row.round === 3)
        .map((row) => [`${row.collegeBranchId}/${row.community}`, row]),
    );
    for (const row of cutoffs.filter((item) => item.year === 2026)) {
      const expected = round3.get(`${row.collegeBranchId}/${row.community}`);
      expect(expected).toBeDefined();
      expect(row.cutoffMark).toBe(expected?.cutoffMark);
      expect(row.generalRank).toBe(expected?.generalRank);
      expect(row.sourcePage).toBe(expected?.sourcePage);
      expect(row.sourceRound).toBe(expected?.sourceRound);
    }
  });

  it("matches the verified CEG Computer Science 2025 and 2026 cutoffs", () => {
    const cegCs = collegeBranches.find(
      (row) => row.collegeCode === "0001" && row.branchCode === "CS",
    );
    expect(cegCs).toBeDefined();

    const rows2025 = cutoffs
      .filter((row) => row.collegeBranchId === cegCs?.id && row.year === 2025)
      .sort((a, b) => a.community.localeCompare(b.community));

    expect(
      rows2025.map((row) => [row.community, row.cutoffMark, row.generalRank]),
    ).toEqual([
      ["BC", 200, 140],
      ["BCM", 200, 218],
      ["MBC", 200, 88],
      ["OC", 200, 28],
      ["SC", 199, 840],
      ["SCA", 199, 725],
      ["ST", 197, 2449],
    ]);

    const rows2026 = cutoffs
      .filter((row) => row.collegeBranchId === cegCs?.id && row.year === 2026)
      .sort((a, b) => a.community.localeCompare(b.community));

    expect(
      rows2026.map((row) => [
        row.community,
        row.cutoffMark,
        row.generalRank,
        row.sourceRound,
        row.sourcePage,
      ]),
    ).toEqual([
      ["BC", 199, 171, 1, 3],
      ["BCM", 199, 210, 1, 4],
      ["MBC", 199, 142, 1, 3],
      ["OC", 200, 44, 1, 1],
      ["SC", 197.5, 558, 1, 9],
      ["SCA", 193.5, 2912, 1, 45],
    ]);
  });

  it("matches the Mass Engineering College 2026 close from Round 3", () => {
    const mass = collegeBranches.find(
      (row) => row.collegeCode === "3838" && row.branchCode === "CS",
    );
    expect(mass).toBeDefined();

    const row = cutoffs.find(
      (item) =>
        item.collegeBranchId === mass?.id &&
        item.community === "OC" &&
        item.year === 2026,
    );
    expect(row).toMatchObject({
      cutoffMark: 110.5,
      generalRank: 200051,
      sourceRound: 3,
      sourcePage: 828,
      sourceDocumentId: "tnea-2026-allotment-r3",
    });
  });
});

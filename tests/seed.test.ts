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
};

type Seat = { collegeBranchId: number; year: number };

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

const colleges = readSeed<College>("colleges");
const branches = readSeed<Branch>("branches");
const collegeBranches = readSeed<CollegeBranch>("college_branches");
const cutoffs = readSeed<Cutoff>("cutoffs");
const seats = readSeed<Seat>("seat_matrix");

describe("seed dataset", () => {
  it("matches the manifest counts", () => {
    expect(colleges).toHaveLength(manifest.counts.colleges);
    expect(branches).toHaveLength(manifest.counts.branches);
    expect(collegeBranches).toHaveLength(manifest.counts.collegeBranches);
    expect(cutoffs).toHaveLength(manifest.counts.cutoffs);
    expect(seats).toHaveLength(manifest.counts.seatMatrix);
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

  it("only stores closing ranks for 2025", () => {
    const yearsWithRanks = new Set(
      cutoffs
        .filter((row) => row.generalRank !== null)
        .map((row) => row.year),
    );
    expect([...yearsWithRanks]).toEqual([2025]);

    const cutoff2025 = cutoffs.filter((row) => row.year === 2025);
    expect(cutoff2025.every((row) => row.generalRank !== null)).toBe(true);
  });

  it("keeps marks in the TNEA cutoff range", () => {
    const invalid = cutoffs.filter(
      (row) =>
        row.cutoffMark !== null &&
        (row.cutoffMark < 0 || row.cutoffMark > 200),
    );
    expect(invalid).toEqual([]);
  });

  it("has unique cutoff and seat keys", () => {
    const cutoffKeys = cutoffs.map(
      (row) => `${row.collegeBranchId}/${row.year}/${row.community}`,
    );
    expect(new Set(cutoffKeys).size).toBe(cutoffKeys.length);

    const seatKeys = seats.map((row) => `${row.collegeBranchId}/${row.year}`);
    expect(new Set(seatKeys).size).toBe(seatKeys.length);
  });

  it("only references known colleges and programmes", () => {
    const collegeCodes = new Set(colleges.map((college) => college.code));
    const branchCodes = new Set(branches.map((branch) => branch.code));
    const collegeBranchIds = new Set(
      collegeBranches.map((row) => row.id),
    );

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
      seats.filter((row) => !collegeBranchIds.has(row.collegeBranchId)),
    ).toEqual([]);
  });

  it("matches the verified CEG Computer Science 2025 cutoffs", () => {
    const cegCs = collegeBranches.find(
      (row) => row.collegeCode === "0001" && row.branchCode === "CS",
    );
    expect(cegCs).toBeDefined();

    const rows = cutoffs
      .filter((row) => row.collegeBranchId === cegCs?.id && row.year === 2025)
      .sort((a, b) => a.community.localeCompare(b.community));

    expect(
      rows.map((row) => [row.community, row.cutoffMark, row.generalRank]),
    ).toEqual([
      ["BC", 200, 140],
      ["BCM", 200, 218],
      ["MBC", 200, 88],
      ["OC", 200, 28],
      ["SC", 199, 840],
      ["SCA", 199, 725],
      ["ST", 197, 2449],
    ]);
  });
});

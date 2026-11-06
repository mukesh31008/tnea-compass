import { describe, expect, it } from "vitest";

import { csvField, parseChoices, type ChoiceRecord } from "@/lib/choices";

function choice(overrides: Partial<ChoiceRecord> = {}): ChoiceRecord {
  return {
    id: 1,
    collegeCode: "0001",
    collegeName: "College of Engineering, Guindy",
    collegeShortName: "CEG",
    district: "Chennai",
    type: "University Department",
    branchCode: "CS",
    branchName: "Computer Science and Engineering",
    cutoffMark: 200,
    rank: 28,
    addedAt: "2026-11-06T12:00:00.000Z",
    ...overrides,
  };
}

describe("choice list storage", () => {
  it("returns an empty list for missing or malformed storage", () => {
    expect(parseChoices(null)).toEqual([]);
    expect(parseChoices("not json")).toEqual([]);
    expect(parseChoices("{}")).toEqual([]);
    expect(parseChoices("[1, 2, 3]")).toEqual([]);
  });

  it("keeps valid records and drops duplicates by programme id", () => {
    const first = choice();
    const duplicate = choice({ branchCode: "IT" });
    const second = choice({ id: 2, branchCode: "IT" });
    expect(parseChoices(JSON.stringify([first, duplicate, second]))).toEqual([
      first,
      second,
    ]);
  });

  it("drops records with the wrong shape", () => {
    const valid = choice();
    const invalid = { ...choice({ id: 2 }), cutoffMark: "200" };
    expect(parseChoices(JSON.stringify([invalid, valid]))).toEqual([valid]);
  });

  it("allows a missing 2025 cutoff and rank", () => {
    const missing = choice({ cutoffMark: null, rank: null });
    expect(parseChoices(JSON.stringify([missing]))).toEqual([missing]);
  });
});

describe("CSV export fields", () => {
  it("leaves plain values unquoted", () => {
    expect(csvField("Chennai")).toBe("Chennai");
    expect(csvField(28)).toBe("28");
  });

  it("quotes commas, quotes and newlines", () => {
    expect(csvField("College of Engineering, Guindy")).toBe(
      '"College of Engineering, Guindy"',
    );
    expect(csvField('B.E. "Civil"')).toBe('"B.E. ""Civil"""');
    expect(csvField("line one\nline two")).toBe('"line one\nline two"');
  });

  it("renders missing values as empty fields", () => {
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
  });
});

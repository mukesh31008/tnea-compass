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
    community: "OC",
    dataYear: 2025,
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

  it("allows a missing closing value and rank", () => {
    const missing = choice({ cutoffMark: null, rank: null });
    expect(parseChoices(JSON.stringify([missing]))).toEqual([missing]);
  });

  it("keeps a recorded community and data year", () => {
    const bc2026 = choice({ community: "BC", dataYear: 2026, rank: 4321 });
    expect(parseChoices(JSON.stringify([bc2026]))).toEqual([bc2026]);
  });

  it("fills legacy records with an explicit null context", () => {
    const legacy = {
      ...choice(),
      community: undefined,
      dataYear: undefined,
    };
    const [parsed] = parseChoices(JSON.stringify([legacy]));
    expect(parsed.community).toBeNull();
    expect(parsed.dataYear).toBeNull();
    expect(parsed.collegeCode).toBe("0001");
    expect(parsed.rank).toBe(28);
  });

  it("drops records with an unknown community", () => {
    const invalid = { ...choice({ id: 2 }), community: "XX" };
    expect(parseChoices(JSON.stringify([invalid, choice()]))).toEqual([choice()]);
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

import { describe, expect, it } from "vitest";
import {
  analyzeChoiceListRisk,
  simulateCounselling,
} from "@/lib/simulator";
import type { ChoiceRecord } from "@/lib/choices";

const mockChoices: ChoiceRecord[] = [
  {
    id: 1,
    collegeCode: "0001",
    collegeName: "CEG Guindy",
    collegeShortName: "CEG",
    branchCode: "CS",
    branchName: "CSE",
    district: "Chennai",
    type: "Government",
    community: "OC",
    dataYear: 2026,
    cutoffMark: 199.5,
    rank: 150,
    addedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    collegeCode: "0004",
    collegeName: "MIT Chromepet",
    collegeShortName: "MIT",
    branchCode: "IT",
    branchName: "IT",
    district: "Chengalpattu",
    type: "Government",
    community: "OC",
    dataYear: 2026,
    cutoffMark: 197.0,
    rank: 850,
    addedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 3,
    collegeCode: "2006",
    collegeName: "PSG Tech",
    collegeShortName: "PSG",
    branchCode: "CS",
    branchName: "CSE",
    district: "Coimbatore",
    type: "Aided",
    community: "OC",
    dataYear: 2026,
    cutoffMark: 195.0,
    rank: 2500,
    addedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 4,
    collegeCode: "1315",
    collegeName: "SSN",
    collegeShortName: "SSN",
    branchCode: "CS",
    branchName: "CSE",
    district: "Chengalpattu",
    type: "Self-Financing",
    community: "OC",
    dataYear: 2026,
    cutoffMark: 192.0,
    rank: 6000,
    addedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("simulateCounselling", () => {
  it("allots the top matching choice for a top rank", () => {
    // Rank 100 qualifies for CEG CS (closing 150)
    const result = simulateCounselling(100, "OC", mockChoices);
    expect(result.rounds[0].status).toBe("allotted");
    expect(result.rounds[0].allottedChoice?.collegeCode).toBe("0001");
    expect(result.rounds[0].allottedChoice?.priority).toBe(1);
    expect(result.rounds[0].upwardMovementChoices.length).toBe(0);
  });

  it("allots a lower choice when higher choices have stricter cutoffs and computes upward movement", () => {
    // Rank 2000 does not qualify for #1 (150) or #2 (850), but qualifies for #3 (2500)
    const result = simulateCounselling(2000, "OC", mockChoices);
    expect(result.rounds[0].status).toBe("allotted");
    expect(result.rounds[0].allottedChoice?.collegeCode).toBe("2006");
    expect(result.rounds[0].allottedChoice?.priority).toBe(3);

    // Should have 2 upward movement candidates (#1 and #2)
    expect(result.rounds[0].upwardMovementChoices.length).toBe(2);
    expect(result.rounds[0].upwardMovementChoices[0].collegeCode).toBe("0001");
  });

  it("advances mid-rank candidate to appropriate entry round", () => {
    // Rank 50,000 enters in Round 2
    const result = simulateCounselling(50000, "OC", mockChoices);
    expect(result.rounds[0].status).toBe("eligible_next_round");
    expect(result.rounds[0].allottedChoice).toBeNull();
  });
});

describe("analyzeChoiceListRisk", () => {
  it("flags empty or shallow choice lists", () => {
    const analysis = analyzeChoiceListRisk([], 5000);
    expect(analysis.totalChoices).toBe(0);
    expect(analysis.recommendations.length).toBeGreaterThan(0);
  });

  it("flags inverted priority order when an easy choice is above a harder choice", () => {
    const invertedChoices: ChoiceRecord[] = [
      {
        ...mockChoices[3], // SSN closing 6000
        id: 101,
      },
      {
        ...mockChoices[0], // CEG closing 150
        id: 102,
      },
    ];

    const analysis = analyzeChoiceListRisk(invertedChoices, 2000);
    expect(analysis.warnings.some((w) => w.includes("Inverted Priority"))).toBe(true);
  });
});

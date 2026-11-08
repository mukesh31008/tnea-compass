import { describe, expect, it } from "vitest";

import {
  extractCommunity,
  extractYear,
  normaliseQuestion,
  unsupportedReason,
} from "@/lib/assistant/guards";

describe("assistant guardrails", () => {
  it("refuses admission-chance and eligibility questions", () => {
    expect(
      unsupportedReason("What is my chance of getting CEG with 190 marks?"),
    ).toContain("does not estimate an admission chance");
    expect(unsupportedReason("Am I eligible for BC quota at PSG?")).toContain(
      "does not estimate an admission chance",
    );
  });

  it("refuses predictions even when they mention a cutoff", () => {
    expect(
      unsupportedReason("Predict the 2027 CEG computer science cutoff"),
    ).toContain("does not predict a future cutoff");
  });

  it("refuses rank-to-mark conversion in both directions", () => {
    expect(unsupportedReason("Convert rank 5000 into a cutoff mark")).toContain(
      "never converts one into the other",
    );
    expect(unsupportedReason("Convert a 190 cutoff to a rank")).toContain(
      "never converts one into the other",
    );
  });

  it("refuses college advice and 'best college' questions", () => {
    expect(unsupportedReason("Which college should I choose?")).toContain(
      "does not rank colleges for you",
    );
    expect(unsupportedReason("What is the best college in Coimbatore?")).toContain(
      "does not rank colleges for you",
    );
  });

  it("refuses facts that are not in the dataset", () => {
    expect(unsupportedReason("What is the placement package at PSG?")).toContain(
      "not in the official TNEA cutoff and seat record",
    );
    expect(unsupportedReason("Show the hostel fee for CEG")).toContain(
      "not in the official TNEA cutoff and seat record",
    );
  });

  it("allows questions that the record can answer", () => {
    const allowed = [
      "What was the 2026 OC close for CEG Computer Science?",
      "Show the R1-R3 timeline for 0001 CS for BC.",
      "Show the 2026 seat matrix for 0001.",
      "Which colleges had the most vacancies in ECE after Round 3?",
      "Compare 0001 and 2006 for Computer Science in 2026.",
      "Where did the 2026 cutoff data come from?",
      "What does allotted community mean?",
    ];
    for (const question of allowed) {
      expect(unsupportedReason(question), question).toBeNull();
    }
  });
});

describe("assistant extraction", () => {
  it("defaults to the 2026 cycle when no year is printed", () => {
    expect(extractYear("Show the OC close for 0001 CS")).toBe(2026);
  });

  it("reads a published year from the question", () => {
    expect(extractYear("What was the 2023 BC close for 0001 CS?")).toBe(2023);
  });

  it("does not treat a college code as a year", () => {
    expect(extractYear("Show the 0001 CS close for 2025")).toBe(2025);
  });

  it("extracts the longest community token first", () => {
    expect(extractCommunity("Show the BCM close")).toBe("BCM");
    expect(extractCommunity("Show the SCA close")).toBe("SCA");
    expect(extractCommunity("Show the MBC close")).toBe("MBC");
    expect(extractCommunity("Show the OC close")).toBe("OC");
    expect(extractCommunity("Show the BC close")).toBe("BC");
    expect(extractCommunity("Show the SC close")).toBe("SC");
    expect(extractCommunity("Show the ST close")).toBe("ST");
  });

  it("does not invent a community", () => {
    expect(extractCommunity("Show the close for 0001 CS")).toBeNull();
  });

  it("normalises punctuation and spacing for cache keys", () => {
    expect(normaliseQuestion("  CEG,   Computer-Science? ")).toBe(
      "ceg computer science",
    );
  });
});

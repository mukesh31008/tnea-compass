import { describe, expect, it } from "vitest";

import { computeEngineeringCutoff } from "@/lib/tracker";

describe("engineering cutoff arithmetic", () => {
  it("adds Maths in full and Physics/Chemistry at half weight", () => {
    const result = computeEngineeringCutoff([
      { subject: "Mathematics", mark: 95, maxMark: 100 },
      { subject: "Physics", mark: 90, maxMark: 100 },
      { subject: "Chemistry", mark: 88, maxMark: 100 },
    ]);

    expect(result.cutoff).toBe(184);
    expect(result.missing).toEqual([]);
  });

  it("normalises marks entered out of a different maximum", () => {
    const result = computeEngineeringCutoff([
      { subject: "Mathematics", mark: 47.5, maxMark: 50 },
      { subject: "Physics", mark: 45, maxMark: 50 },
      { subject: "Chemistry", mark: 44, maxMark: 50 },
    ]);

    expect(result.cutoff).toBe(184);
  });

  it("returns a null cutoff and names every missing subject", () => {
    const result = computeEngineeringCutoff([
      { subject: "Mathematics", mark: 95, maxMark: 100 },
    ]);

    expect(result.cutoff).toBeNull();
    expect(result.missing).toEqual(["Physics", "Chemistry"]);
  });

  it("does not treat a missing subject as zero", () => {
    const result = computeEngineeringCutoff([
      { subject: "Mathematics", mark: 95, maxMark: 100 },
      { subject: "Physics", mark: 0, maxMark: 100 },
    ]);

    expect(result.cutoff).toBeNull();
    expect(result.missing).toEqual(["Chemistry"]);
  });

  it("keeps a genuinely zero Chemistry mark as zero", () => {
    const result = computeEngineeringCutoff([
      { subject: "Mathematics", mark: 100, maxMark: 100 },
      { subject: "Physics", mark: 100, maxMark: 100 },
      { subject: "Chemistry", mark: 0, maxMark: 100 },
    ]);

    expect(result.cutoff).toBe(150);
    expect(result.missing).toEqual([]);
  });

  it("ignores non-cutoff subjects", () => {
    const result = computeEngineeringCutoff([
      { subject: "Mathematics", mark: 80, maxMark: 100 },
      { subject: "Physics", mark: 80, maxMark: 100 },
      { subject: "Chemistry", mark: 80, maxMark: 100 },
      { subject: "Biology", mark: 99, maxMark: 100 },
    ]);

    expect(result.cutoff).toBe(160);
  });
});

import { describe, expect, it } from "vitest";

import {
  BAND_META,
  isValidCutoff,
  isValidRank,
  predictByCutoff,
  predictByRank,
} from "@/lib/predictor";

describe("rank predictions", () => {
  it("puts a rank comfortably inside the closing rank in the strongest band", () => {
    expect(predictByRank(800, 1000).band).toBe("comfortable");
    expect(predictByRank(800, 1000).advantage).toBe(200);
  });

  it("treats the exact closing rank as favourable", () => {
    expect(predictByRank(1000, 1000).band).toBe("likely");
    expect(predictByRank(1000, 1000).advantage).toBe(0);
  });

  it("marks ranks slightly outside the close as borderline", () => {
    expect(predictByRank(1150, 1000).band).toBe("borderline");
    expect(predictByRank(149, 130).band).toBe("borderline");
  });

  it("marks a wider gap as a stretch", () => {
    expect(predictByRank(1400, 1000).band).toBe("stretch");
    expect(predictByRank(1401, 1000).band).toBe("unlikely");
  });

  it("reports a negative advantage when the rank is outside the close", () => {
    const result = predictByRank(2000, 1000);
    expect(result.band).toBe("unlikely");
    expect(result.advantage).toBe(-1000);
  });
});

describe("cutoff predictions", () => {
  it("puts a mark five or more above the close in the strongest band", () => {
    expect(predictByCutoff(195, 190).band).toBe("comfortable");
    expect(predictByCutoff(195, 190).advantage).toBe(5);
  });

  it("treats the exact closing mark as favourable", () => {
    expect(predictByCutoff(190, 190).band).toBe("likely");
    expect(predictByCutoff(191.5, 190).advantage).toBeCloseTo(1.5);
  });

  it("marks up to two marks below as borderline", () => {
    expect(predictByCutoff(188, 190).band).toBe("borderline");
    expect(predictByCutoff(190, 192).band).toBe("borderline");
  });

  it("marks two to five marks below as a stretch", () => {
    expect(predictByCutoff(187.5, 190).band).toBe("stretch");
    expect(predictByCutoff(185, 190).band).toBe("stretch");
  });

  it("marks more than five marks below as unlikely", () => {
    expect(predictByCutoff(184.5, 190).band).toBe("unlikely");
  });
});

describe("input validation", () => {
  it("accepts whole ranks within the supported range", () => {
    expect(isValidRank(1)).toBe(true);
    expect(isValidRank(300000)).toBe(true);
    expect(isValidRank(0)).toBe(false);
    expect(isValidRank(300001)).toBe(false);
    expect(isValidRank(12.5)).toBe(false);
    expect(isValidRank(Number.NaN)).toBe(false);
  });

  it("accepts cutoff marks within the TNEA range", () => {
    expect(isValidCutoff(0)).toBe(true);
    expect(isValidCutoff(200)).toBe(true);
    expect(isValidCutoff(190.5)).toBe(true);
    expect(isValidCutoff(-0.5)).toBe(false);
    expect(isValidCutoff(200.5)).toBe(false);
    expect(isValidCutoff(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("band metadata", () => {
  it("labels every band exactly once", () => {
    const labels = Object.values(BAND_META).map((meta) => meta.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

import { describe, expect, it } from "vitest";
import { calculateDistanceKm, getDistrictDistance } from "@/lib/geo";

describe("geo utility", () => {
  it("calculates distance between known Tamil Nadu district centroids", () => {
    // Chennai to Coimbatore is approximately 420-500 km
    const dist = getDistrictDistance("Chennai", "Coimbatore");
    expect(dist).not.toBeNull();
    expect(dist!).toBeGreaterThan(400);
    expect(dist!).toBeLessThan(520);
  });

  it("calculates distance between raw coordinates", () => {
    // Distance between (0, 0) and (0, 1) is ~111 km
    const dist = calculateDistanceKm(0, 0, 0, 1);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(120);
  });

  it("returns 0 km for identical district centroids", () => {
    const dist = getDistrictDistance("Madurai", "Madurai");
    expect(dist).toBe(0);
  });

  it("returns null for unknown districts", () => {
    const dist = getDistrictDistance("Atlantis", "Chennai");
    expect(dist).toBeNull();
  });
});

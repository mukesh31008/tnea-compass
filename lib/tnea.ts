export const COMMUNITIES = [
  "OC",
  "BC",
  "BCM",
  "MBC",
  "SC",
  "SCA",
  "ST",
] as const;

export type Community = (typeof COMMUNITIES)[number];

export const COMMUNITY_LABELS: Record<Community, string> = {
  OC: "Open",
  BC: "Backward Class",
  BCM: "Backward Class (Muslim)",
  MBC: "Most Backward Class",
  SC: "Scheduled Caste",
  SCA: "Scheduled Caste (Arunthathiyar)",
  ST: "Scheduled Tribe",
};

export const COLLEGE_TYPES = [
  "Government",
  "Government Aided",
  "Self-Financing",
  "University Department",
] as const;

export type CollegeType = (typeof COLLEGE_TYPES)[number];

export const CUTOFF_YEARS = [2020, 2021, 2022, 2023, 2024, 2025] as const;

export function isCommunity(value: string): value is Community {
  return (COMMUNITIES as readonly string[]).includes(value);
}

export function communityLabel(value: string): string {
  return isCommunity(value) ? COMMUNITY_LABELS[value] : value;
}

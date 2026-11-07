import { isCommunity, type Community } from "@/lib/tnea";

export const CHOICES_STORAGE_KEY = "tnea-compass:choices:v1";
export const MAX_CHOICES = 50;

export type ChoiceInput = {
  id: number;
  collegeCode: string;
  collegeName: string;
  collegeShortName: string | null;
  district: string | null;
  type: string;
  branchCode: string;
  branchName: string;
  /** The community whose closing value is attached to this choice. */
  community: Community;
  /** The counselling year the attached closing value belongs to. */
  dataYear: number;
  cutoffMark: number | null;
  rank: number | null;
};

/**
 * Records saved before community/year context was introduced are kept, but the
 * missing fields stay null. The UI must show them as "not recorded" rather than
 * silently assuming OC or 2025.
 */
export type ChoiceRecord = Omit<ChoiceInput, "community" | "dataYear"> & {
  community: Community | null;
  dataYear: number | null;
  addedAt: string;
};

export type AddChoiceResult = "added" | "exists" | "full";

function isChoiceRecord(value: unknown): value is ChoiceRecord {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    Number.isInteger(item.id) &&
    typeof item.collegeCode === "string" &&
    typeof item.collegeName === "string" &&
    typeof item.type === "string" &&
    typeof item.branchCode === "string" &&
    typeof item.branchName === "string" &&
    (item.collegeShortName === null ||
      typeof item.collegeShortName === "string") &&
    (item.district === null || typeof item.district === "string") &&
    (item.community === null ||
      item.community === undefined ||
      (typeof item.community === "string" && isCommunity(item.community))) &&
    (item.dataYear === null ||
      item.dataYear === undefined ||
      (typeof item.dataYear === "number" && Number.isInteger(item.dataYear))) &&
    (item.cutoffMark === null || typeof item.cutoffMark === "number") &&
    (item.rank === null || typeof item.rank === "number") &&
    typeof item.addedAt === "string"
  );
}

/** Fill legacy records with explicit nulls instead of assuming a context. */
function normalizeChoice(record: ChoiceRecord): ChoiceRecord {
  return {
    ...record,
    community: record.community ?? null,
    dataYear: record.dataYear ?? null,
  };
}

/** Parse a stored list defensively and drop duplicate programme ids. */
export function parseChoices(raw: string | null): ChoiceRecord[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<number>();
    const choices: ChoiceRecord[] = [];
    for (const item of parsed) {
      if (!isChoiceRecord(item) || seen.has(item.id)) continue;
      seen.add(item.id);
      choices.push(normalizeChoice(item));
      if (choices.length === MAX_CHOICES) break;
    }
    return choices;
  } catch {
    return [];
  }
}

/** Quote a CSV field exactly once, including commas, quotes and newlines. */
export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

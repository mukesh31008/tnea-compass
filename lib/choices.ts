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
  cutoffMark: number | null;
  rank: number | null;
};

export type ChoiceRecord = ChoiceInput & {
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
    (item.cutoffMark === null || typeof item.cutoffMark === "number") &&
    (item.rank === null || typeof item.rank === "number") &&
    typeof item.addedAt === "string"
  );
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
      choices.push(item);
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

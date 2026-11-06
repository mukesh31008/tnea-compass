export type ChanceBand =
  | "comfortable"
  | "likely"
  | "borderline"
  | "stretch"
  | "unlikely";

export type Prediction = {
  band: ChanceBand;
  label: string;
  note: string;
  /** Positive means your position is better than the 2025 closing value. */
  advantage: number;
};

export const BAND_ORDER: Record<ChanceBand, number> = {
  comfortable: 0,
  likely: 1,
  borderline: 2,
  stretch: 3,
  unlikely: 4,
};

export const BAND_META: Record<
  ChanceBand,
  { label: string; tone: "success" | "warning" | "outline" | "destructive" }
> = {
  comfortable: { label: "Strong signal", tone: "success" },
  likely: { label: "Favourable", tone: "success" },
  borderline: { label: "Borderline", tone: "warning" },
  stretch: { label: "Stretch", tone: "outline" },
  unlikely: { label: "Unlikely", tone: "destructive" },
};

/**
 * Rank mode. A TNEA rank is better when the number is smaller, so the user is
 * inside the closing rank when their rank is at or below it.
 */
export function predictByRank(
  rank: number,
  closingRank: number,
): Prediction {
  const advantage = closingRank - rank;
  const ratio = rank / closingRank;

  if (ratio <= 0.8) {
    return {
      band: "comfortable",
      label: BAND_META.comfortable.label,
      note: "Your rank is well inside the 2025 closing rank.",
      advantage,
    };
  }
  if (ratio <= 1) {
    return {
      band: "likely",
      label: BAND_META.likely.label,
      note: "Your rank is at or better than the 2025 closing rank.",
      advantage,
    };
  }
  if (ratio <= 1.15) {
    return {
      band: "borderline",
      label: BAND_META.borderline.label,
      note: "Close to the 2025 closing rank; later rounds can move.",
      advantage,
    };
  }
  if (ratio <= 1.4) {
    return {
      band: "stretch",
      label: BAND_META.stretch.label,
      note: "Outside the 2025 closing rank, but within reach if it moves.",
      advantage,
    };
  }
  return {
    band: "unlikely",
    label: BAND_META.unlikely.label,
    note: "Well outside the 2025 closing rank for this programme.",
    advantage,
  };
}

/**
 * Cutoff mode. A higher mark is better, so the user is inside the closing
 * mark when their cutoff is at or above it.
 */
export function predictByCutoff(
  cutoff: number,
  closingMark: number,
): Prediction {
  const advantage = cutoff - closingMark;

  if (advantage >= 5) {
    return {
      band: "comfortable",
      label: BAND_META.comfortable.label,
      note: "Your mark is 5 or more above the 2025 closing mark.",
      advantage,
    };
  }
  if (advantage >= 0) {
    return {
      band: "likely",
      label: BAND_META.likely.label,
      note: "Your mark is at or above the 2025 closing mark.",
      advantage,
    };
  }
  if (advantage >= -2) {
    return {
      band: "borderline",
      label: BAND_META.borderline.label,
      note: "Within 2 marks of the 2025 closing mark.",
      advantage,
    };
  }
  if (advantage >= -5) {
    return {
      band: "stretch",
      label: BAND_META.stretch.label,
      note: "2 to 5 marks below the 2025 closing mark.",
      advantage,
    };
  }
  return {
    band: "unlikely",
    label: BAND_META.unlikely.label,
    note: "More than 5 marks below the 2025 closing mark.",
    advantage,
  };
}

export function isValidRank(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 300000;
}

export function isValidCutoff(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 200;
}

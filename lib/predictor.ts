export type PositionBand =
  | "comfortable"
  | "likely"
  | "borderline"
  | "stretch"
  | "unlikely";

export type Prediction = {
  band: PositionBand;
  label: string;
  note: string;
  /** Positive means your position is better than the published close. */
  advantage: number;
};

export const BAND_ORDER: Record<PositionBand, number> = {
  comfortable: 0,
  likely: 1,
  borderline: 2,
  stretch: 3,
  unlikely: 4,
};

/**
 * Labels describe distance from the published close. They deliberately avoid
 * words such as "likely", "strong" or "chance", which read as an admission
 * prediction. The band IDs are kept for stored links and sorting.
 */
export const BAND_META: Record<
  PositionBand,
  { label: string; tone: "success" | "warning" | "outline" | "destructive" }
> = {
  comfortable: { label: "Well inside", tone: "success" },
  likely: { label: "Inside", tone: "success" },
  borderline: { label: "Near the close", tone: "warning" },
  stretch: { label: "Outside", tone: "outline" },
  unlikely: { label: "Well outside", tone: "destructive" },
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
      note: "Your rank is more than 20% inside the published closing rank.",
      advantage,
    };
  }
  if (ratio <= 1) {
    return {
      band: "likely",
      label: BAND_META.likely.label,
      note: "Your rank is at or inside the published closing rank.",
      advantage,
    };
  }
  if (ratio <= 1.15) {
    return {
      band: "borderline",
      label: BAND_META.borderline.label,
      note: "Your rank is up to 15% outside the published closing rank; a later round can move it.",
      advantage,
    };
  }
  if (ratio <= 1.4) {
    return {
      band: "stretch",
      label: BAND_META.stretch.label,
      note: "Your rank is 15–40% outside the published closing rank.",
      advantage,
    };
  }
  return {
    band: "unlikely",
    label: BAND_META.unlikely.label,
    note: "Your rank is more than 40% outside the published closing rank.",
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
      note: "Your mark is 5 or more above the published closing mark.",
      advantage,
    };
  }
  if (advantage >= 0) {
    return {
      band: "likely",
      label: BAND_META.likely.label,
      note: "Your mark is at or above the published closing mark.",
      advantage,
    };
  }
  if (advantage >= -2) {
    return {
      band: "borderline",
      label: BAND_META.borderline.label,
      note: "Your mark is up to 2 marks below the published closing mark.",
      advantage,
    };
  }
  if (advantage >= -5) {
    return {
      band: "stretch",
      label: BAND_META.stretch.label,
      note: "Your mark is 2 to 5 marks below the published closing mark.",
      advantage,
    };
  }
  return {
    band: "unlikely",
    label: BAND_META.unlikely.label,
    note: "Your mark is more than 5 marks below the published closing mark.",
    advantage,
  };
}

export function isValidRank(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 300000;
}

export function isValidCutoff(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 200;
}

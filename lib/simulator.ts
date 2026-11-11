import { type ChoiceRecord } from "@/lib/choices";
import { predictByRank } from "@/lib/predictor";

export type SimulatedRoundResult = {
  round: number;
  allottedChoice: (ChoiceRecord & { priority: number }) | null;
  status: "allotted" | "not_allotted" | "eligible_next_round";
  rationale: string;
  upwardMovementChoices: (ChoiceRecord & { priority: number; probability: "likely" | "possible" | "unlikely" })[];
};

export type ChoiceRiskAnalysis = {
  totalChoices: number;
  safeCount: number;
  targetCount: number;
  ambitiousCount: number;
  unlikelyCount: number;
  warnings: string[];
  recommendations: string[];
};

export type SimulationResult = {
  candidateRank: number;
  community: string;
  rounds: SimulatedRoundResult[];
  riskAnalysis: ChoiceRiskAnalysis;
};

/**
 * Standard TNEA general counselling rank bounds per round (historical baseline).
 */
export const TNEA_ROUND_RANK_BOUNDS = {
  1: { min: 1, max: 26000 },
  2: { min: 26001, max: 95000 },
  3: { min: 95001, max: 180000 },
} as const;

/**
 * Analyzes the list of choices for ordering errors and risk balance.
 */
export function analyzeChoiceListRisk(
  choices: ChoiceRecord[],
  candidateRank: number,
): ChoiceRiskAnalysis {
  let safeCount = 0;
  let targetCount = 0;
  let ambitiousCount = 0;
  let unlikelyCount = 0;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  choices.forEach((choice, index) => {
    const closing = choice.rank;
    if (!closing) return;

    const pred = predictByRank(candidateRank, closing);
    if (pred.band === "comfortable") {
      safeCount++;
    } else if (pred.band === "likely" || pred.band === "borderline") {
      targetCount++;
    } else if (pred.band === "stretch") {
      ambitiousCount++;
    } else {
      unlikelyCount++;
    }

    // Check inverted priority warning: If an easier-to-get choice is placed BEFORE a harder-to-get choice
    if (index < choices.length - 1) {
      const nextChoice = choices[index + 1];
      if (nextChoice.rank && closing) {
        // Higher closing rank means easier to get
        if (closing > nextChoice.rank * 1.35) {
          warnings.push(
            `Inverted Priority: Choice #${index + 1} (${choice.collegeCode} - ${choice.branchCode}) closes around rank ${closing.toLocaleString("en-IN")}, while Choice #${index + 2} (${nextChoice.collegeCode} - ${nextChoice.branchCode}) below it has a stricter closing rank (${nextChoice.rank.toLocaleString("en-IN")}). If you are allotted Choice #${index + 1}, Choice #${index + 2} will be forfeited!`,
          );
        }
      }
    }
  });

  if (choices.length === 0) {
    recommendations.push("Add at least 15 to 25 choices to ensure counselling safety.");
  } else if (choices.length < 10) {
    recommendations.push(
      "Your choice list has fewer than 10 options. TNEA allows unlimited choices; adding 15+ prevents being left without any seat.",
    );
  }

  if (safeCount === 0 && choices.length > 0) {
    warnings.push(
      "No Safe/Backup choices detected! All your choices are target or ambitious. You risk receiving no seat in your initial round.",
    );
    recommendations.push(
      "Add at least 3 to 5 'Safe' branches where the historical closing rank is 20%+ higher than your rank.",
    );
  }

  const distinctDistricts = new Set(choices.map((c) => c.district).filter(Boolean));
  if (distinctDistricts.size === 1 && choices.length >= 8) {
    recommendations.push(
      `All choices are in ${Array.from(distinctDistricts)[0]}. Consider exploring colleges in nearby tier-1/tier-2 hubs for greater branch variety.`,
    );
  }

  return {
    totalChoices: choices.length,
    safeCount,
    targetCount,
    ambitiousCount,
    unlikelyCount,
    warnings,
    recommendations,
  };
}

/**
 * Runs a multi-round TNEA counselling simulation for a candidate.
 */
export function simulateCounselling(
  candidateRank: number,
  community: string,
  choices: ChoiceRecord[],
): SimulationResult {
  const riskAnalysis = analyzeChoiceListRisk(choices, candidateRank);
  const rounds: SimulatedRoundResult[] = [];

  // Determine which round the student's rank enters
  let entryRound = 3;
  if (candidateRank <= TNEA_ROUND_RANK_BOUNDS[1].max) {
    entryRound = 1;
  } else if (candidateRank <= TNEA_ROUND_RANK_BOUNDS[2].max) {
    entryRound = 2;
  }

  for (let r = 1; r <= 3; r++) {
    if (r < entryRound) {
      rounds.push({
        round: r,
        allottedChoice: null,
        status: "eligible_next_round",
        rationale: `Your rank (${candidateRank.toLocaleString("en-IN")}) is scheduled for Round ${entryRound}. Round ${r} is reserved for ranks 1 to ${TNEA_ROUND_RANK_BOUNDS[r as 1 | 2].max.toLocaleString("en-IN")}.`,
        upwardMovementChoices: [],
      });
      continue;
    }

    // Evaluate choices in priority order
    let allotted: (ChoiceRecord & { priority: number }) | null = null;
    let allottedIndex = -1;

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const closing = choice.rank;
      if (!closing) continue;

      // In later rounds or upward movement, closing ranks slightly expand due to seat shifts
      const roundExpansionMultiplier = r === entryRound ? 1.0 : r === 2 ? 1.04 : 1.08;
      const effectiveClosing = closing * roundExpansionMultiplier;

      if (candidateRank <= effectiveClosing) {
        allotted = { ...choice, priority: i + 1 };
        allottedIndex = i;
        break;
      }
    }

    if (allotted) {
      // Find upward movement possibilities (choices above the allotted one)
      const upwardChoices: (ChoiceRecord & { priority: number; probability: "likely" | "possible" | "unlikely" })[] = [];

      for (let i = 0; i < allottedIndex; i++) {
        const higherChoice = choices[i];
        const closing = higherChoice.rank;
        if (!closing) continue;

        const ratio = candidateRank / closing;
        let prob: "likely" | "possible" | "unlikely" = "unlikely";
        if (ratio <= 1.05) {
          prob = "likely";
        } else if (ratio <= 1.18) {
          prob = "possible";
        }

        upwardChoices.push({
          ...higherChoice,
          priority: i + 1,
          probability: prob,
        });
      }

      rounds.push({
        round: r,
        allottedChoice: allotted,
        status: "allotted",
        rationale: `Simulated Allotment at Priority #${allotted.priority}: ${allotted.collegeName} (${allotted.branchName}). Your rank is within the closing threshold for this round.`,
        upwardMovementChoices: upwardChoices,
      });
    } else {
      rounds.push({
        round: r,
        allottedChoice: null,
        status: r < 3 ? "eligible_next_round" : "not_allotted",
        rationale:
          r < 3
            ? `No choice in your current list had cutoffs accommodating rank ${candidateRank.toLocaleString("en-IN")}. You proceed to Round ${r + 1} with seat vacancy re-allotment.`
            : `All choices were outside the closing cutoffs. No seat allotted in general rounds. Supplemental or SCA-to-SC / special counselling rounds may apply.`,
        upwardMovementChoices: [],
      });
    }
  }

  return {
    candidateRank,
    community,
    rounds,
    riskAnalysis,
  };
}

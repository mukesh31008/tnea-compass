import "server-only";

import { z } from "zod";

import { COMMUNITIES, isCommunity } from "@/lib/tnea";
import {
  findBranchByCode,
  resolveBranch,
  resolveCollege,
  resolveDistrict,
  type BranchRef,
  type CollegeRef,
} from "@/lib/assistant/data";
import { extractCommunity, extractYear } from "@/lib/assistant/guards";

export type AssistantIntent =
  | "closes"
  | "timeline"
  | "seats"
  | "vacancies"
  | "sources"
  | "dataset"
  | "method"
  | "profile"
  | "compare"
  | "clarify";

export type ParsedQuery = {
  intent: AssistantIntent;
  college: CollegeRef | null;
  colleges: CollegeRef[];
  branch: BranchRef | null;
  community: string | null;
  year: number;
  district: string | null;
  usedModel: boolean;
};

export const modelEnabled = Boolean(process.env.OPENAI_API_KEY?.trim());

const NEEDS_COLLEGE: AssistantIntent[] = [
  "closes",
  "timeline",
  "seats",
  "profile",
];

function detectIntent(lower: string): AssistantIntent {
  if (
    /\b(how many colleges|how many cutoffs|how many rows|how many ranks|how many seats|dataset|data set|statistics|stats|coverage)\b/.test(
      lower,
    )
  ) {
    return "dataset";
  }
  if (
    /\b(allotted community|what does.*mean|methodology|method|how do you|how is|not reported|missing value|2024 rank|duplicate export)\b/.test(
      lower,
    )
  ) {
    return "method";
  }
  if (
    /\b(source|sources|pdf|provenance|document|documented|come from|where did|derived|origin)\b/.test(
      lower,
    )
  ) {
    return "sources";
  }
  if (/\b(vacanc(?:y|ies)|unfilled|left over|remaining seat)\b/.test(lower)) {
    return "vacancies";
  }
  if (/\b(seat|seats|intake|sanctioned)\b/.test(lower)) {
    return "seats";
  }
  if (/\b(timeline|round|rounds|r1|r2|r3|moved|movement|cumulative)\b/.test(lower)) {
    return "timeline";
  }
  if (/\b(tell me about|overview|profile|hostel|autonomous|affiliated|established)\b/.test(lower)) {
    return "profile";
  }
  if (/\b(compare|versus|vs\.?)\b/.test(lower)) {
    return "compare";
  }
  return "closes";
}

async function resolveCompareColleges(
  question: string,
): Promise<CollegeRef[]> {
  const found = new Map<string, CollegeRef>();

  for (const match of question.matchAll(/\b(\d{4})\b/g)) {
    const college = await resolveCollege(question, match[1]);
    if (college) found.set(college.code, college);
    if (found.size >= 2) return [...found.values()].slice(0, 2);
  }

  const stripped = question.replace(/\bcompare\b/i, " ");
  const segments = stripped
    .split(/\s+(?:vs\.?|versus|and)\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);

  for (const segment of segments) {
    const college = await resolveCollege(segment);
    if (college) found.set(college.code, college);
    if (found.size >= 2) break;
  }

  return [...found.values()].slice(0, 2);
}

async function heuristicParse(question: string): Promise<ParsedQuery> {
  const lower = question.toLowerCase();
  const intent = detectIntent(lower);
  const year = extractYear(question);
  const community = extractCommunity(question);
  const branch = await resolveBranch(question);
  const district = await resolveDistrict(question);

  if (intent === "compare") {
    return {
      intent,
      college: null,
      colleges: await resolveCompareColleges(question),
      branch,
      community,
      year,
      district,
      usedModel: false,
    };
  }

  const wantsLeaderboard =
    /\b(which colleges|colleges with|most vacancies|highest vacancies|top .*vacanc|list .*vacanc|leaderboard)\b/.test(
      lower,
    );
  const college =
    NEEDS_COLLEGE.includes(intent) ||
    (intent === "vacancies" && !wantsLeaderboard)
      ? await resolveCollege(question)
      : null;

  return {
    intent,
    college,
    colleges: [],
    branch,
    community,
    year,
    district,
    usedModel: false,
  };
}

const modelSchema = z.object({
  intent: z.enum([
    "closes",
    "timeline",
    "seats",
    "vacancies",
    "sources",
    "dataset",
    "method",
    "profile",
    "compare",
    "clarify",
  ]),
  collegeCode: z.string().nullable(),
  collegeSearch: z.string().nullable(),
  branchCode: z.string().nullable(),
  branchSearch: z.string().nullable(),
  community: z.string().nullable(),
  year: z.number().int().min(2020).max(2026).nullable(),
  district: z.string().nullable(),
});

const MODEL_SYSTEM = `You translate Tamil Nadu engineering admission questions into a fixed query for a database.
Return only the schema. Never answer the question and never invent a value.
Intents:
- closes: published closing mark/rank for a college and optional branch/community
- timeline: cumulative 2026 Round 1-3 closes
- seats: seat matrix and reported vacancies
- vacancies: the colleges with the most reported vacant seats
- sources: official PDFs and provenance
- dataset: coverage counts
- method: how values are defined or calculated
- profile: college overview (district, type, hostel)
- compare: two colleges side by side
- clarify: the question cannot be mapped safely
Years are 2020-2026. Communities are ${COMMUNITIES.join(", ")}.
If the question asks for chances, prediction, eligibility, advice, fees, placements or rank-mark conversion, use clarify.
For a college, give the four-digit TNEA code when printed, otherwise a distinctive name in collegeSearch.`;

async function modelParse(question: string): Promise<ParsedQuery | null> {
  if (!modelEnabled) return null;

  try {
    const [{ generateObject }, { createOpenAICompatible }] = await Promise.all([
      import("ai"),
      import("@ai-sdk/openai-compatible"),
    ]);

    const provider = createOpenAICompatible({
      name: "tnea-compass",
      baseURL: process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { object } = await generateObject({
      model: provider(process.env.AI_MODEL ?? "gpt-4o-mini"),
      schema: modelSchema,
      system: MODEL_SYSTEM,
      prompt: question,
      temperature: 0,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(7000),
    });

    const college = object.collegeCode
      ? await resolveCollege(question, object.collegeCode)
      : object.collegeSearch
        ? await resolveCollege(`${question} ${object.collegeSearch}`)
        : null;

    let branch = object.branchCode
      ? await findBranchByCode(object.branchCode)
      : null;
    if (!branch && object.branchSearch) {
      branch = await resolveBranch(object.branchSearch);
    }

    const community =
      object.community && isCommunity(object.community)
        ? object.community
        : extractCommunity(question);

    const district = object.district
      ? await resolveDistrict(`${question} ${object.district}`)
      : await resolveDistrict(question);

    return {
      intent: object.intent,
      college,
      colleges:
        object.intent === "compare"
          ? await resolveCompareColleges(question)
          : [],
      branch,
      community,
      year: object.year ?? extractYear(question),
      district,
      usedModel: true,
    };
  } catch {
    return null;
  }
}

/**
 * Heuristic first, model second. The model only runs when the deterministic
 * parser cannot find the college it needs. It never receives private tracker
 * data and cannot choose a free-form SQL query.
 */
export async function parseQuestion(question: string): Promise<ParsedQuery> {
  const heuristic = await heuristicParse(question);
  const missingCollege =
    NEEDS_COLLEGE.includes(heuristic.intent) && !heuristic.college;
  const missingCompare =
    heuristic.intent === "compare" && heuristic.colleges.length < 2;

  if (!missingCollege && !missingCompare && heuristic.intent !== "clarify") {
    return heuristic;
  }

  const modelled = await modelParse(question);
  if (!modelled) return heuristic;

  if (NEEDS_COLLEGE.includes(modelled.intent) && !modelled.college) {
    return heuristic;
  }
  if (modelled.intent === "compare" && modelled.colleges.length < 2) {
    return heuristic;
  }

  return modelled;
}

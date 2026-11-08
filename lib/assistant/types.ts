/**
 * Public response contract for the grounded assistant. Shared by the route
 * handler and the client UI, so no server-only code can leak into the bundle.
 */

export type AssistantKind = "answer" | "clarify" | "refusal";

export type AssistantTable = {
  title: string;
  columns: string[];
  rows: string[][];
  note?: string;
};

export type AssistantCitation = {
  label: string;
  detail?: string;
  href?: string;
};

export type AssistantResult = {
  kind: AssistantKind;
  title: string;
  summary: string;
  tables: AssistantTable[];
  citations: AssistantCitation[];
  caveats: string[];
  followUps: string[];
  usedModel: boolean;
};

export type AssistantRequest = {
  question: string;
};

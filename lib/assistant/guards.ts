/**
 * Pure guardrail and extraction helpers. Kept free of database and server-only
 * imports so the refusal rules can be unit tested without a running app.
 */

const UNSUPPORTED: { pattern: RegExp; reason: string }[] = [
  {
    pattern:
      /\b(chance|chances|probability|probabilities|likely|guarantee|guaranteed|safe|sure|will i get|can i get|do i have a chance|am i eligible|eligibility)\b/,
    reason:
      "This tool reads published cutoff and seat records. It does not estimate an admission chance or decide eligibility.",
  },
  {
    pattern: /\b(predict|prediction|forecast|expected cutoff|next year)\b/,
    reason:
      "The assistant reports past published values only. It does not predict a future cutoff.",
  },
  {
    pattern:
      /\b(convert|conversion)\b.*\b(rank|mark|cutoff)\b|\b(rank|cutoff)\b.*\b(to|into)\b.*\b(mark|rank)\b/,
    reason:
      "A rank and a cutoff mark are different measures. This tool never converts one into the other.",
  },
  {
    pattern:
      /\b(best college|which college should|should i choose|recommend|advice|which is better)\b/,
    reason:
      "The assistant can show published records, but it does not rank colleges for you or make the choice for you.",
  },
  {
    pattern:
      /\b(placement|placements|package|salary|recruit|naac|accreditation|ranking|nirf|review|hostel fee|tuition fee|management quota|donation)\b/,
    reason:
      "That fact is not in the official TNEA cutoff and seat record used here. The assistant does not fill the gap with estimates.",
  },
];

export function unsupportedReason(question: string): string | null {
  const lower = question.toLowerCase();
  for (const rule of UNSUPPORTED) {
    if (rule.pattern.test(lower)) return rule.reason;
  }
  return null;
}

export function extractYear(question: string): number {
  const match = question.match(/\b(202[0-6])\b/);
  return match ? Number(match[1]) : 2026;
}

export function extractCommunity(question: string): string | null {
  const match = question.match(/\b(BCM|SCA|MBC|OC|BC|SC|ST)\b/);
  return match ? match[1] : null;
}

export function normaliseQuestion(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

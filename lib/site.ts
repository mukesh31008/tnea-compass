/**
 * Public links shared by pages, the assistant and error reports. Keeping them
 * here stops a half-updated link from appearing on one page and not another.
 */

export const REPO_URL = "https://github.com/mukesh31008/tnea-compass";
export const ISSUES_NEW_URL = `${REPO_URL}/issues/new`;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export type ReportContext = {
  kind?: "data" | "answer" | "site";
  collegeCode?: string | null;
  branchCode?: string | null;
  community?: string | null;
  year?: number | string | null;
  question?: string | null;
  answerTitle?: string | null;
};

/**
 * A prefilled GitHub issue. The public tracker is deliberate: corrections are
 * visible, and no private tracker data is ever placed in the URL.
 */
export function reportIssueUrl(context: ReportContext = {}): string {
  const subject =
    context.kind === "answer"
      ? "Incorrect assistant answer"
      : context.kind === "data"
        ? "Data correction"
        : "Site issue";

  const target = [
    context.collegeCode ? `college ${context.collegeCode}` : null,
    context.branchCode ? `branch ${context.branchCode}` : null,
    context.community ?? null,
    context.year ? String(context.year) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const title = target ? `[${subject}] ${target}` : `[${subject}] `;

  const body = [
    "## What looks wrong",
    "",
    "Describe the value you expected and the value the site shows.",
    "",
    "## Locator",
    "",
    `- Page: ${context.kind === "answer" ? "Assistant answer" : "Public record"}`,
    `- College code: ${context.collegeCode ?? "not specified"}`,
    `- Branch code: ${context.branchCode ?? "not specified"}`,
    `- Community: ${context.community ?? "not specified"}`,
    `- Year: ${context.year ?? "not specified"}`,
    context.question ? `- Question: ${context.question}` : null,
    context.answerTitle ? `- Answer title: ${context.answerTitle}` : null,
    "",
    "## Evidence",
    "",
    "Please link the official TNEA page or PDF that supports the correction. Do not paste private tracker data.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const params = new URLSearchParams({ title, body, labels: context.kind === "answer" ? "assistant" : context.kind === "data" ? "data" : "bug" });
  return `${ISSUES_NEW_URL}?${params.toString()}`;
}

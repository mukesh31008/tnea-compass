"use client";

import * as React from "react";
import {
  ArrowRight,
  BookOpen,
  Copy,
  Download,
  ExternalLink,
  FileWarning,
  Flag,
  Loader2,
  Quote,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  AssistantResult,
  AssistantTable,
} from "@/lib/assistant/types";
import { reportIssueUrl, SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  {
    label: "A single close",
    question: "What was the 2026 OC close for CEG Computer Science?",
  },
  {
    label: "Round movement",
    question: "Show the R1–R3 timeline for 0001 CS for BC.",
  },
  {
    label: "Seats",
    question: "Show the 2026 seat matrix for 0001.",
  },
  {
    label: "Vacancies",
    question: "Which colleges had the most vacancies in ECE after Round 3?",
  },
  {
    label: "Two colleges",
    question: "Compare 0001 and 2006 for Computer Science in 2026.",
  },
  {
    label: "Provenance",
    question: "Where did the 2026 cutoff data come from?",
  },
];

type State =
  | { status: "idle" }
  | { status: "loading"; question: string }
  | { status: "error"; question: string; message: string }
  | { status: "done"; question: string; result: AssistantResult };

type CollegeOption = {
  code: string;
  name: string;
  shortName: string | null;
  district: string | null;
};

type BranchOption = {
  code: string;
  name: string;
  colleges: number;
};

function shareUrlFor(question: string): string {
  return `${SITE_URL}/assistant?q=${encodeURIComponent(question)}`;
}

function answerAsText(result: AssistantResult, question: string): string {
  const lines = [
    `Question: ${question}`,
    "",
    result.title,
    result.summary,
    "",
    ...result.tables.flatMap((table) => [
      table.title,
      table.columns.join(" | "),
      ...table.rows.map((row) => row.join(" | ")),
      table.note ? `Note: ${table.note}` : "",
      "",
    ]),
    ...result.citations.map(
      (citation, index) =>
        `[${index + 1}] ${citation.label}${citation.href ? ` — ${citation.href}` : ""}`,
    ),
    "",
    ...result.caveats.map((caveat) => `Read with care: ${caveat}`),
  ];
  return lines.filter((line) => line !== "").join("\n");
}

function csvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function downloadTableCsv(table: AssistantTable, question: string) {
  const rows = [table.columns, ...table.rows]
    .map((row) => row.map(csvField).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${rows}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const slug = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  anchor.href = url;
  anchor.download = `tnea-${slug || "answer"}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast.success("Table downloaded as CSV");
}

export function AssistantAnswer({
  initialQuestion = "",
  colleges = [],
  branches = [],
}: {
  initialQuestion?: string;
  colleges?: CollegeOption[];
  branches?: BranchOption[];
}) {
  const [question, setQuestion] = React.useState(initialQuestion);
  const [state, setState] = React.useState<State>({ status: "idle" });
  const [pickedCollege, setPickedCollege] = React.useState("");
  const [pickedBranch, setPickedBranch] = React.useState("");
  const answerRef = React.useRef<HTMLDivElement>(null);
  const askedInitial = React.useRef(false);

  const ask = React.useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.length < 3) return;

    setQuestion(trimmed);
    setState({ status: "loading", question: trimmed });

    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        `/assistant?q=${encodeURIComponent(trimmed)}`,
      );
    }

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { result?: AssistantResult; error?: string }
        | null;

      if (!response.ok || !payload?.result) {
        setState({
          status: "error",
          question: trimmed,
          message:
            payload?.error ??
            "The record could not be read just now. Try again in a moment.",
        });
        return;
      }

      setState({
        status: "done",
        question: trimmed,
        result: payload.result,
      });

      window.requestAnimationFrame(() => {
        answerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch {
      setState({
        status: "error",
        question: trimmed,
        message:
          "The assistant could not be reached. Check your connection and try again.",
      });
    }
  }, []);

  React.useEffect(() => {
    if (!initialQuestion || askedInitial.current) return;
    askedInitial.current = true;
    void ask(initialQuestion);
  }, [ask, initialQuestion]);

  function useTarget() {
    const college = colleges.find((item) => item.code === pickedCollege);
    if (!college) return;
    const branch = branches.find((item) => item.code === pickedBranch);
    setQuestion(
      `What was the 2026 OC close for ${college.code}${branch ? ` ${branch.code}` : ""}?`,
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
      <div className="lg:sticky lg:top-24">
        <Card className="overflow-hidden border-border/80 p-0 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
                <Search className="size-3.5" />
              </span>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Query the ledger
              </p>
            </div>
            <Badge variant="mono" className="gap-1">
              <ShieldCheck className="size-3" />
              public data only
            </Badge>
          </div>

          <form
            className="p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(question);
            }}
          >
            <div className="mb-3 rounded-lg border border-dashed border-border bg-surface/40 p-2.5">
              <p className="mb-2 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Quick target
              </p>
              <div className="grid gap-2 sm:grid-cols-[1.35fr_1fr_auto]">
                <label className="block">
                  <span className="sr-only">College</span>
                  <select
                    value={pickedCollege}
                    onChange={(event) => setPickedCollege(event.target.value)}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-[11.5px] outline-none focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20"
                  >
                    <option value="">Pick a college code</option>
                    {colleges.map((college) => (
                      <option key={college.code} value={college.code}>
                        {college.code} — {college.shortName ?? college.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">Branch</span>
                  <select
                    value={pickedBranch}
                    onChange={(event) => setPickedBranch(event.target.value)}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-[11.5px] outline-none focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20"
                  >
                    <option value="">Any branch</option>
                    {branches.map((branch) => (
                      <option key={branch.code} value={branch.code}>
                        {branch.code} — {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-[11px]"
                  onClick={useTarget}
                  disabled={!pickedCollege}
                >
                  Fill
                </Button>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                Fills a starter question. Change the year or community before
                asking if you need another record.
              </p>
            </div>

            <label htmlFor="assistant-question" className="sr-only">
              Ask a question about the published TNEA record
            </label>
            <div className="relative">
              <textarea
                id="assistant-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void ask(question);
                  }
                }}
                rows={4}
                maxLength={500}
                placeholder="e.g. What was the 2026 OC close for CEG Computer Science?"
                className="w-full resize-none rounded-lg border border-input bg-background p-3 text-[15px] leading-relaxed shadow-xs outline-none transition-colors placeholder:text-muted-foreground/75 focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20"
              />
              <span className="pointer-events-none absolute bottom-2.5 right-3 font-mono text-[10px] text-muted-foreground">
                {question.length}/500
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Names, codes, branches, communities, years.
              </p>
              <Button
                type="submit"
                size="sm"
                disabled={question.trim().length < 3 || state.status === "loading"}
                className="gap-1.5"
              >
                {state.status === "loading" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="size-3.5" />
                )}
                Ask the record
              </Button>
            </div>
          </form>

          <div className="border-t border-border bg-surface/40 p-4">
            <p className="mb-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Read the record
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((example) => (
                <button
                  key={example.question}
                  type="button"
                  onClick={() => void ask(example.question)}
                  className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-[11.5px] leading-snug text-foreground/80 transition-colors hover:border-primary/30 hover:bg-accent/40 hover:text-foreground"
                >
                  <span className="font-mono text-[9px] uppercase tracking-wide text-primary">
                    {example.label}
                  </span>
                  <span className="max-w-[15rem] truncate">{example.question}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="mt-4 rounded-xl border border-dashed border-border bg-surface/40 p-4">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <FileWarning className="size-3.5 text-warning" />
            It will refuse some questions
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            No admission chances, eligibility rulings, rankings, fee or placement
            claims, and no rank-to-mark conversion. Those are not in the record,
            so they are not answered.
          </p>
        </div>
      </div>

      <div ref={answerRef} className="min-w-0 scroll-mt-24" aria-live="polite">
        {state.status === "idle" && <EmptyState />}
        {state.status === "loading" && <LoadingState question={state.question} />}
        {state.status === "error" && (
          <ErrorState message={state.message} question={state.question} />
        )}
        {state.status === "done" && (
          <AnswerCard
            result={state.result}
            question={state.question}
            onFollowUp={(next) => void ask(next)}
          />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="fine-grid relative overflow-hidden border-border/80 p-8 md:p-10">
      <div className="relative max-w-md">
        <span className="grid size-11 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Quote className="size-5" />
        </span>
        <h2 className="display mt-5 text-2xl leading-tight text-foreground sm:text-3xl">
          One answer. Every number sourced.
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          This is not a chatbot. It reads the published TNEA record and returns a
          single evidence card: the value, the community basis, the round and the
          PDF page it came from.
        </p>

        <dl className="mt-7 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
              It can read
            </dt>
            <dd className="mt-1 text-[13px] leading-relaxed text-foreground/80">
              Closes, round timelines, seats, vacancies, college profiles and
              source documents.
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
              It cannot see
            </dt>
            <dd className="mt-1 text-[13px] leading-relaxed text-foreground/80">
              Your profile, marks, exams, applications or choice list. Nothing
              private is read or stored.
            </dd>
          </div>
        </dl>

        <p className="mt-7 flex items-center gap-2 border-t border-border pt-4 text-[11.5px] text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Deterministic answers work without any AI key. A model, if configured,
          only maps an ambiguous question to a fixed lookup.
        </p>
      </div>
    </Card>
  );
}

function LoadingState({ question }: { question: string }) {
  return (
    <Card className="border-border/80 p-6 md:p-8">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin text-primary" />
        Reading the record for “{question}”
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted/80" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted/80" />
        <div className="mt-6 h-36 animate-pulse rounded-lg bg-muted/60" />
      </div>
    </Card>
  );
}

function ErrorState({
  message,
  question,
}: {
  message: string;
  question: string;
}) {
  return (
    <Card className="border-destructive/25 bg-destructive/5 p-6 md:p-8">
      <Badge variant="destructive">No answer</Badge>
      <h2 className="display mt-3 text-2xl text-foreground">
        The record did not answer
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
      <p className="mt-4 border-t border-border/70 pt-3 font-mono text-[11px] text-muted-foreground">
        Question: {question}
      </p>
    </Card>
  );
}

function AnswerCard({
  result,
  question,
  onFollowUp,
}: {
  result: AssistantResult;
  question: string;
  onFollowUp: (question: string) => void;
}) {
  const isRefusal = result.kind === "refusal";
  const isClarify = result.kind === "clarify";

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/80 shadow-sm",
        isRefusal && "border-warning/30",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3",
          isRefusal
            ? "border-warning/25 bg-warning/5"
            : "border-border bg-surface/70",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={isRefusal ? "warning" : isClarify ? "secondary" : "success"}
            className="font-mono text-[10px] uppercase tracking-wide"
          >
            {isRefusal ? "outside the record" : isClarify ? "needs a target" : "cited answer"}
          </Badge>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {result.usedModel ? "model mapped the question" : "deterministic lookup"}
          </span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          no conversation stored
        </span>
      </div>

      <div className="p-5 md:p-7">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
          Asked
        </p>
        <p className="mt-1 border-l-2 border-primary/30 pl-3 text-[13px] italic leading-relaxed text-foreground/70">
          {question}
        </p>

        <h2 className="display mt-5 text-2xl leading-tight text-foreground sm:text-[1.75rem]">
          {result.title}
        </h2>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-foreground/85">
          {result.summary}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 print-hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-[11px]"
            onClick={async () => {
              const url = shareUrlFor(question);
              try {
                if (navigator.share) {
                  await navigator.share({ title: result.title, url });
                  return;
                }
                await navigator.clipboard.writeText(url);
                toast.success("Share link copied");
              } catch {
                toast.error("Could not copy the link");
              }
            }}
          >
            <Share2 className="size-3.5" />
            Share
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-[11px]"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  answerAsText(result, question),
                );
                toast.success("Answer copied with its citations");
              } catch {
                toast.error("Could not copy the answer");
              }
            }}
          >
            <Copy className="size-3.5" />
            Copy with citations
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-[11px]">
            <a
              href={reportIssueUrl({
                kind: "answer",
                question,
                answerTitle: result.title,
              })}
              target="_blank"
              rel="noreferrer"
            >
              <Flag className="size-3.5" />
              Report this answer
            </a>
          </Button>
        </div>

        {result.tables.map((table) => (
          <section key={table.title} className="mt-6">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">
                {table.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {table.note && (
                  <p className="text-[11px] text-muted-foreground">{table.note}</p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[10px] print-hidden"
                  onClick={() => downloadTableCsv(table, question)}
                >
                  <Download className="size-3" />
                  CSV
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[520px] border-collapse text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-border bg-surface/80">
                    {table.columns.map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="whitespace-nowrap px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr
                      key={`${table.title}-${rowIndex}`}
                      className="border-b border-border/70 last:border-0 odd:bg-background/40"
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${cellIndex}-${cell}`}
                          className={cn(
                            "px-3 py-2 align-top leading-snug",
                            cellIndex === 0
                              ? "font-medium text-foreground"
                              : "text-foreground/75",
                            /^#?[\d,]+[A-Z]?$/.test(cell.trim()) &&
                              "font-mono tabular-nums",
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {result.citations.length > 0 && (
          <section className="mt-6 rounded-lg border border-border bg-surface/50 p-4">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">
              <BookOpen className="size-3.5 text-primary" />
              Where this comes from
            </h3>
            <ul className="mt-2.5 space-y-2.5">
              {result.citations.map((citation, index) => (
                <li key={`${citation.label}-${index}`} className="text-[12px] leading-snug">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>{" "}
                  {citation.href ? (
                    <a
                      href={citation.href}
                      target={citation.href.startsWith("http") ? "_blank" : undefined}
                      rel={citation.href.startsWith("http") ? "noreferrer" : undefined}
                      className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary"
                    >
                      {citation.label}
                      {citation.href.startsWith("http") && (
                        <ExternalLink className="ml-1 inline size-3" />
                      )}
                    </a>
                  ) : (
                    <span className="font-medium text-foreground">{citation.label}</span>
                  )}
                  {citation.detail && (
                    <span className="mt-0.5 block pl-5 font-mono text-[10.5px] text-muted-foreground">
                      {citation.detail}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {result.caveats.length > 0 && (
          <section className="mt-4 rounded-lg border border-warning/25 bg-warning/5 p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-warning">
              Read with care
            </h3>
            <ul className="mt-2 space-y-1.5">
              {result.caveats.map((caveat) => (
                <li
                  key={caveat}
                  className="flex gap-2 text-[12px] leading-relaxed text-foreground/75"
                >
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-warning/70" />
                  {caveat}
                </li>
              ))}
            </ul>
          </section>
        )}

        {result.followUps.length > 0 && (
          <section className="mt-5 border-t border-border pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Ask next
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.followUps.map((followUp) => (
                <button
                  key={followUp}
                  type="button"
                  onClick={() => onFollowUp(followUp)}
                  className="rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-[11.5px] text-foreground/80 transition-colors hover:border-primary/30 hover:bg-accent/40 hover:text-foreground"
                >
                  {followUp}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </Card>
  );
}

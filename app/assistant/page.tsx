import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Database, FileCheck2, ShieldCheck } from "lucide-react";

import { AssistantAnswer } from "@/components/assistant-answer";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBranchOptions, getCollegeOptions } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Ask the record",
  description:
    "Ask a question about published TNEA cutoff marks, closing ranks, round timelines, seats and vacancies. Every answer is cited to an official source document.",
};

export const dynamic = "force-dynamic";

const PRINCIPLES = [
  {
    icon: Database,
    title: "Official record only",
    body: "Answers are read from the ingested TNEA documents: 2020–2026 cutoffs, 2025–2026 closing ranks, the 2026 seat matrix and post-Round-3 vacancies.",
  },
  {
    icon: FileCheck2,
    title: "Every value has a source",
    body: "Cutoff answers show the year, round and PDF page. The source ledger records a SHA-256 hash for each document.",
  },
  {
    icon: ShieldCheck,
    title: "Missing stays missing",
    body: "If a row is not published, the answer says Not reported. It is never filled with zero, a guess or a predicted number.",
  },
];

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawQuestion = Array.isArray(params.q) ? params.q[0] : params.q;
  const initialQuestion = rawQuestion?.slice(0, 500).trim() ?? "";

  const [colleges, branches] = await Promise.all([
    getCollegeOptions().catch(() => []),
    getBranchOptions().catch(() => []),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Ask the record"
        title="A cited answer, not a conversation"
        description="Ask for a published cutoff, a round timeline, a seat count or a vacancy figure. The assistant returns one evidence card with the number, its community basis and the source page — or it refuses."
        actions={
          <>
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
              <ShieldCheck className="size-3.5 text-primary" />
              Deterministic by default
            </Badge>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/about#data">
                Data ledger
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </>
        }
      />

      <section className="container-page py-8 md:py-10">
        <AssistantAnswer
          initialQuestion={initialQuestion}
          colleges={colleges}
          branches={branches}
        />
      </section>

      <section className="container-page pb-4">
        <div className="grid gap-3 border-t border-border pt-8 md:grid-cols-3">
          {PRINCIPLES.map((principle) => (
            <div key={principle.title} className="flex gap-3 rounded-xl bg-surface/40 p-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-primary">
                <principle.icon className="size-4" />
              </span>
              <div>
                <h2 className="text-[12.5px] font-semibold text-foreground">
                  {principle.title}
                </h2>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {principle.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

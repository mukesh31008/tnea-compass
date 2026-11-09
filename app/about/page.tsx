import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  FileText,
  FileWarning,
  Info,
  ShieldCheck,
} from "lucide-react";

import seedManifest from "@/data/seed/manifest.json";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getDatasetStats, getSourceDocuments } from "@/lib/db/queries";
import { reportIssueUrl } from "@/lib/site";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Method and data provenance",
  description:
    "How TNEA Compass computes closing values, what every number points to, and which official documents were parsed.",
};

export const dynamic = "force-dynamic";

const RULES = [
  {
    title: "2020–2024 cutoff marks",
    body: "The published cutoff mark for the candidate's community, taken from the previous project's archived TNEA export and cleaned to published marks at or below 200. Closing ranks for these years are not published in this dataset.",
  },
  {
    title: "2025 cutoff marks and closing ranks",
    body: "The published mark and closing rank for the candidate's community, taken from the archived TNEA export.",
  },
  {
    title: "2026 closes",
    body: "The R3 cumulative close: the last-ranked allotment in the union of Rounds 1–3, grouped by the community the seat was allotted against. A tie-break suffix is kept exactly as printed.",
  },
  {
    title: "Round timeline",
    body: "Round 2 is cumulative: it includes every allotment in Round 1. Round 3 includes Rounds 1 and 2. The R3 cumulative close is the last-ranked allotment in the union of Rounds 1–3.",
  },
  {
    title: "Missing values",
    body: "A missing mark, rank, seat or vacancy is stored as null and shown as Not reported. It is never shown as zero and never estimated.",
  },
  {
    title: "Position bands",
    body: "A rank is compared directly with a closing rank; a cutoff mark is compared directly with a closing mark. The two are never converted into each other.",
  },
  {
    title: "Ranks",
    body: "Closing ranks are stored for 2025 and 2026 only. The archived 2024 rank export is an exact duplicate of 2025, so it is not reused.",
  },
];

const YEAR_PROVENANCE: Record<
  number,
  { grouping: string; rank: string; source: string }
> = {
  2020: {
    grouping: "Candidate community",
    rank: "Not published here",
    source: "Archived TNEA all-years export",
  },
  2021: {
    grouping: "Candidate community",
    rank: "Not published here",
    source: "Archived TNEA all-years export",
  },
  2022: {
    grouping: "Candidate community",
    rank: "Not published here",
    source: "Archived TNEA all-years export",
  },
  2023: {
    grouping: "Candidate community",
    rank: "Not published here",
    source: "Archived TNEA all-years export",
  },
  2024: {
    grouping: "Candidate community",
    rank: "Duplicate of 2025, not used",
    source: "Archived TNEA all-years export",
  },
  2025: {
    grouping: "Candidate community",
    rank: "Published",
    source: "Archived TNEA export",
  },
  2026: {
    grouping: "Community the seat was allotted against",
    rank: "Published, with source round and page",
    source: "Official TNEA 2026 allotment PDFs, seat matrix and vacancy statement",
  },
};

export default async function AboutPage() {
  const [documents, stats] = await Promise.all([
    getSourceDocuments(),
    getDatasetStats(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Every number has a document behind it"
        description="TNEA Compass is an independent reading of the official Tamil Nadu engineering admissions record. It does not estimate a cutoff, invent a placement figure, or promise a seat."
        actions={
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            {documents.length} verified source documents
          </Badge>
        }
      />

      <section className="container-page py-8 md:py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Colleges", formatNumber(stats.colleges)],
            ["Cutoff rows", formatNumber(stats.cutoffs)],
            ["Round closes", formatNumber(stats.roundCutoffs)],
            ["Vacancy rows", formatNumber(stats.vacancies)],
          ].map(([label, value]) => (
            <Card key={label} className="px-4 py-3">
              <p className="font-mono text-xl font-semibold">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </Card>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-primary/20 bg-accent/30 px-4 py-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-foreground">
              Dataset version
              <Badge variant="mono">{seedManifest.generatedAt}</Badge>
            </p>
            <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-muted-foreground">
              {seedManifest.source}
            </p>
          </div>
          <a
            href={reportIssueUrl({ kind: "data" })}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <FileWarning className="size-3.5 text-warning" />
            Report an error
            <ArrowRight className="size-3.5" />
          </a>
        </div>

        <div id="coverage" className="mt-10 scroll-mt-24">
          <h2 className="display text-2xl sm:text-3xl">Published year coverage</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Each year is a separate published record with its own grouping rule.
            A year with no published rank is not converted into one.
          </p>
          <Card className="mt-5 overflow-hidden">
            <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable table">
              <table className="mobile-sticky-first w-full min-w-[44rem] text-left text-[12px]">
                <thead className="border-b border-border bg-surface/60 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Year</th>
                    <th className="px-4 py-2.5 text-right font-medium">Rows</th>
                    <th className="px-4 py-2.5 font-medium">Community grouping</th>
                    <th className="px-4 py-2.5 font-medium">Closing rank</th>
                    <th className="px-4 py-2.5 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.cutoffYears.map((entry) => {
                    const provenance = YEAR_PROVENANCE[entry.year];
                    return (
                      <tr key={entry.year} className="hover:bg-muted/25">
                        <td className="px-4 py-3 font-mono font-semibold">
                          {entry.year}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatNumber(entry.count)}
                        </td>
                        <td className="px-4 py-3 text-foreground/80">
                          {provenance?.grouping ?? "Not documented"}
                        </td>
                        <td className="px-4 py-3 text-foreground/80">
                          {provenance?.rank ?? "Not documented"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {provenance?.source ?? "Not documented"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div id="method" className="mt-10 scroll-mt-24">
          <h2 className="display text-2xl sm:text-3xl">Method</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The public record is stored at the row level. Each closing value
            carries its year, community, counselling round and PDF page, so a
            reader can move from a table on this site back to the official
            document.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {RULES.map((rule) => (
              <Card key={rule.title} className="p-5">
                <BookOpenCheck className="size-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{rule.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  {rule.body}
                </p>
              </Card>
            ))}
          </div>
        </div>

        <div id="data" className="mt-12 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="display text-2xl sm:text-3xl">Data provenance</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                These are the exact PDFs the 2026 rows were parsed from. The
                SHA-256 hash is checked before ingest, so a changed document
                cannot silently replace a published value.
              </p>
            </div>
            <Badge variant="mono">
              {formatNumber(documents.length)} documents
            </Badge>
          </div>

          <div className="mt-5 space-y-3">
            {documents.map((document) => (
              <Card key={document.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      <h3 className="text-sm font-semibold">
                        {document.title}
                      </h3>
                      <Badge variant="outline">
                        {document.year}
                        {document.round ? ` · Round ${document.round}` : ""}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {document.authority} · {document.pageCount} PDF pages ·
                      retrieved {document.retrievedAt}
                    </p>
                    <p className="mt-2 break-all font-mono text-[10px] leading-relaxed text-muted-foreground">
                      SHA-256 {document.sha256}
                    </p>
                  </div>
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    Open official PDF
                    <ArrowRight className="size-3.5" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div id="privacy" className="mt-12 scroll-mt-24">
          <h2 className="display text-2xl sm:text-3xl">Your account, your data</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The public tools are usable without an account. An account only
            stores the planning record you type, and only you can read it.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              {
                title: "What is stored",
                body: "Email, a password hash, an optional profile, subject marks, exams and applications. No Aadhaar, date of birth, photo, uploaded certificate or public profile.",
              },
              {
                title: "Who can read it",
                body: "Only the signed-in account. Every tracker query is filtered by the session user, and the export route refuses to run without a session.",
              },
              {
                title: "How to leave",
                body: "Download a JSON copy from the dashboard, then delete the account. Profile, marks, exams and applications are removed explicitly; the local choice list is browser-only.",
              },
            ].map((item) => (
              <Card key={item.title} className="p-5">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </Card>
            ))}
          </div>
        </div>

        <div id="disclaimer" className="mt-12 scroll-mt-24">
          <Card className="border-primary/20 bg-accent/30 p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Info className="size-4 text-primary" />
              Disclaimer
            </h2>
            <div className="mt-3 space-y-3 text-[12px] leading-relaxed text-muted-foreground">
              <p>
                TNEA Compass is not affiliated with the Directorate of Technical
                Education, Tamil Nadu, or with any counselling authority. It is
                an independent reading of published documents.
              </p>
              <p>
                A position band is a distance reading from a published close. It
                is not an admission probability, a guarantee, or a prediction of
                a future round. Seat availability, reservation rules and
                counselling rules can change. Always verify a decision against
                the current official notification at{" "}
                <a
                  href="https://www.tneaonline.org"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline"
                >
                  tneaonline.org
                </a>
                .
              </p>
              <p>
                Placements, NAAC grades, tuition fees and vacancy claims that are
                not present in the official record are not shown on this site.
                Read the{" "}
                <Link href="/colleges" className="font-medium text-primary underline">
                  college explorer
                </Link>{" "}
                or go back to the{" "}
                <Link href="/predictor" className="font-medium text-primary underline">
                  position reading
                </Link>
                .
              </p>
            </div>
          </Card>
        </div>

        <div id="corrections" className="mt-12 scroll-mt-24">
          <Card className="border-warning/25 bg-warning/5 p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <FileWarning className="size-4 text-warning" />
              Found a mismatch?
            </h2>
            <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-foreground/80">
              Corrections are handled in the public issue tracker so the change
              and its evidence stay visible. Include the college code, branch,
              year, community, the value shown and the official PDF page that
              supports the correction. Do not include private tracker data.
            </p>
            <a
              href={reportIssueUrl({ kind: "data" })}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              Open a correction issue
              <ArrowRight className="size-3.5" />
            </a>
          </Card>
        </div>
      </section>
    </>
  );
}

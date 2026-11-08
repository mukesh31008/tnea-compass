import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BEFORE_YOU_ACT,
  PATHWAYS,
  PATHWAY_VERSION,
} from "@/content/admission-pathways";

export const metadata: Metadata = {
  title: "Admission pathways",
  description:
    "A versioned, plain-language map of TNEA government-quota counselling, management quota, lateral entry and special categories, with links to the official rules.",
};

export default function PathwaysPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admission pathways"
        title="Four doors, one rulebook that is not ours"
        description="A plain-language map of the routes into Tamil Nadu engineering colleges. Each card points to the authority that publishes the actual rule; none of them replaces the current official notification."
        actions={
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <BookOpenCheck className="size-3.5 text-primary" />
            Rules version {PATHWAY_VERSION.version}
          </Badge>
        }
      />

      <section className="container-page py-8 md:py-10">
        <Card className="border-primary/20 bg-accent/30 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="size-4 text-primary" />
                Reviewed for the {PATHWAY_VERSION.effectiveYear} cycle
              </h2>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                This page is version {PATHWAY_VERSION.version}, reviewed on{" "}
                {PATHWAY_VERSION.reviewedOn}. It describes the shape of each
                route, not the current dates, fees or seat counts. Those are
                published by the {PATHWAY_VERSION.authority} and change every
                cycle.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href={PATHWAY_VERSION.primarySource}
                  target="_blank"
                  rel="noreferrer"
                >
                  TNEA portal
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a
                  href={PATHWAY_VERSION.departmentSource}
                  target="_blank"
                  rel="noreferrer"
                >
                  DTE Tamil Nadu
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            </div>
          </div>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {PATHWAYS.map((pathway, index) => (
            <Card key={pathway.id} className="flex flex-col p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Badge variant="outline">{pathway.tag}</Badge>
              </div>
              <h2 className="mt-3 text-base font-semibold leading-snug">
                {pathway.title}
              </h2>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                {pathway.summary}
              </p>

              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Who it is for
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {pathway.who}
                </p>
              </div>

              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  What the route looks like
                </p>
                <ol className="mt-2 space-y-1.5">
                  {pathway.steps.map((step, stepIndex) => (
                    <li
                      key={step}
                      className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground"
                    >
                      <span className="mt-0.5 font-mono text-[10px] text-primary">
                        {stepIndex + 1}.
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-4 flex gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2.5">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {pathway.caution}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary" />
              Before you act on any route
            </h2>
            <ul className="mt-3 space-y-2.5">
              {BEFORE_YOU_ACT.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-[12px] leading-relaxed text-muted-foreground"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-sm font-semibold">Use the public record</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              Once you know which route applies, read the published closes
              before you fill a choice. A cutoff table is evidence about a past
              round, not a promise about the next one.
            </p>
            <div className="mt-4 grid gap-2">
              {[
                ["/cutoffs?year=2026", "2026 final closes"],
                ["/predictor?year=2026", "Read your position"],
                ["/colleges", "College records"],
                ["/about#data", "Source documents"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[12px] font-medium transition-colors hover:border-primary/30 hover:bg-muted/30"
                >
                  {label}
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}

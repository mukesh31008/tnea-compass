import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Info, ShieldCheck } from "lucide-react";

import { TrackerShell } from "@/components/tracker-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAcademicRecords, getStudentProfile } from "@/lib/db/tracker";
import { requireUser } from "@/lib/session";
import { computeEngineeringCutoff } from "@/lib/tracker";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Results",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const session = await requireUser("/tracker/results");
  const [records, profile] = await Promise.all([
    getAcademicRecords(session.user.id),
    getStudentProfile(session.user.id),
  ]);

  const class12 = records.filter((record) => record.classLevel === 12);
  const otherYears = records.filter((record) => record.classLevel !== 12);
  const cutoff = computeEngineeringCutoff(class12);
  const community = profile?.community ?? "";
  const communityLabel = community || "your community";

  const predictorHref =
    cutoff.cutoff === null
      ? "/predictor"
      : `/predictor?${new URLSearchParams({
          mode: "cutoff",
          cutoff: cutoff.cutoff.toFixed(3),
          ...(community ? { community } : {}),
        }).toString()}`;

  return (
    <TrackerShell
      eyebrow="Private tracker"
      title="Results and cutoff"
      description="Read your own Class 12 marks as a cutoff out of 200, then take that number to the published closing marks. No rank is invented."
      actions={
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/tracker/academic">Edit marks</Link>
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Calculator className="size-4 text-primary" />
                  Engineering cutoff
                </h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Maths + Physics ÷ 2 + Chemistry ÷ 2, from your Class 12 entries.
                </p>
              </div>
              <Badge variant={cutoff.cutoff === null ? "outline" : "success"}>
                {cutoff.cutoff === null ? "Incomplete" : "Your calculation"}
              </Badge>
            </div>

            <div className="px-5 py-6">
              {cutoff.cutoff === null ? (
                <div>
                  <p className="font-mono text-3xl font-semibold text-muted-foreground">
                    Not enough marks
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                    Add Class 12{" "}
                    {cutoff.missing.length > 0
                      ? cutoff.missing.join(", ")
                      : "Mathematics, Physics and Chemistry"}{" "}
                    in the{" "}
                    <Link
                      href="/tracker/academic"
                      className="font-medium text-primary underline"
                    >
                      academic tracker
                    </Link>
                    . Missing subjects are never treated as zero.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-4xl font-semibold tracking-tight">
                      {cutoff.cutoff.toFixed(3)}
                      <span className="ml-1.5 text-base font-normal text-muted-foreground">
                        / 200
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Arithmetic on your own marks
                    </p>
                  </div>
                  <Button asChild className="gap-1.5">
                    <Link href={predictorHref}>
                      Compare with published closes
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {cutoff.working.length > 0 && (
              <div className="border-t border-border bg-surface/40 px-5 py-4">
                <table className="w-full text-left text-[12px]">
                  <thead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-medium">Subject</th>
                      <th className="pb-2 text-right font-medium">
                        Normalised /100
                      </th>
                      <th className="pb-2 text-right font-medium">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {cutoff.working.map((row) => (
                      <tr key={row.subject}>
                        <td className="py-2 font-medium">{row.subject}</td>
                        <td className="py-2 text-right font-mono">
                          {row.normalised.toFixed(3)}
                        </td>
                        <td className="py-2 text-right font-mono text-muted-foreground">
                          {row.subject === "Mathematics" ? "full" : "half"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold">Class 12 subjects on record</h2>
            </div>
            {class12.length === 0 ? (
              <p className="px-5 py-6 text-[12px] text-muted-foreground">
                No Class 12 marks have been entered.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[30rem] text-left text-[12px]">
                  <thead className="border-b border-border bg-surface/60 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2 font-medium">Subject</th>
                      <th className="px-3 py-2 text-right font-medium">Mark</th>
                      <th className="px-5 py-2 text-right font-medium">Percent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {class12.map((record) => (
                      <tr key={record.id}>
                        <td className="px-5 py-2.5 font-medium">{record.subject}</td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          {formatNumber(record.mark)} / {formatNumber(record.maxMark)}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono text-muted-foreground">
                          {((record.mark / record.maxMark) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-primary/20 bg-accent/25 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Info className="size-4 text-primary" />
              What this is not
            </h2>
            <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
              <p>
                It is not a TNEA rank. The official rank depends on the full
                applicant pool and is published by TNEA, not calculated here.
              </p>
              <p>
                It is not an admission probability. The position reading compares
                a number with a published close; it does not estimate your chance
                of a seat.
              </p>
              <p>
                Some programmes use different subject rules. The formula above is
                the common engineering cutoff; check the official information
                before relying on it.
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary" />
              Community context
            </h2>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {community
                ? `Your profile says ${community}. The comparison will use ${communityLabel} closes, grouped by candidate community for 2020–2025 and by allotted community for 2026.`
                : "No community is set on your profile. You can still open the position reading and choose a community there; the tracker never assumes one."}
            </p>
            <div className="mt-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/profile">Edit profile</Link>
              </Button>
            </div>
          </Card>

          {otherYears.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Earlier classes</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {otherYears.length} Class 10/11 subject{" "}
                {otherYears.length === 1 ? "mark" : "marks"} saved for your own
                record. They do not affect the cutoff above.
              </p>
            </Card>
          )}
        </div>
      </div>
    </TrackerShell>
  );
}

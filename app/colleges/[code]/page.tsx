import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bus,
  GraduationCap,
  Home,
  Info,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCollegeProfile } from "@/lib/db/queries";
import { CUTOFF_YEARS, COMMUNITIES, COMMUNITY_LABELS } from "@/lib/tnea";
import {
  formatCutoff,
  formatInr,
  formatNumber,
  shortCollegeName,
} from "@/lib/utils";

const loadProfile = cache(getCollegeProfile);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const profile = await loadProfile(code.toUpperCase());
  if (!profile) return { title: "College not found" };

  return {
    title: `${profile.college.shortName ?? profile.college.name} (${profile.college.code})`,
    description: `${shortCollegeName(profile.college.name, 140)} — TNEA cutoffs, seats, hostel and fee data.`,
  };
}

function StatusBadge({ value }: { value: boolean | null }) {
  if (value === null) return <Badge variant="outline">Not reported</Badge>;
  return (
    <Badge variant={value ? "success" : "outline"}>
      {value ? "Available" : "Not available"}
    </Badge>
  );
}

function FactRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="text-right text-[12px] font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

export default async function CollegeProfilePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const profile = await loadProfile(code.toUpperCase());
  if (!profile) notFound();

  const { college, hostel, fees, branches, totals } = profile;

  return (
    <>
      <PageHeader
        eyebrow={`TNEA code ${college.code}`}
        title={college.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {college.district ?? "District not reported"}
            </span>
            <span className="text-border">·</span>
            <span>{college.type}</span>
            <span className="text-border">·</span>
            <span>
              {college.autonomous === null
                ? "Autonomy not reported"
                : college.autonomous
                  ? "Autonomous"
                  : "Non-autonomous"}
            </span>
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/colleges">
                <ArrowLeft className="size-3.5" />
                Explorer
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href={`/compare?colleges=${college.code}`}>
                Compare
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </>
        }
      >
        <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
          {[
            ["Programmes", formatNumber(totals.branches)],
            ["2025 seats", formatNumber(totals.seats2025)],
            ["Allotted", formatNumber(totals.allotted2025)],
            ["Vacant", formatNumber(totals.vacant2025)],
          ].map(([label, value]) => (
            <div key={label} className="bg-card px-4 py-3">
              <p className="font-mono text-lg font-semibold tracking-tight">
                {value}
              </p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </PageHeader>

      <section className="container-page py-8 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="min-w-0 space-y-8">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <GraduationCap className="size-4 text-primary" />
                    Programmes and seats
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Approved intake from the branch record; seats from the 2025
                    allotment matrix.
                  </p>
                </div>
                <Badge variant="mono">{branches.length} branches</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[38rem] text-left text-[12px]">
                  <thead className="border-b border-border bg-surface/60 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Branch</th>
                      <th className="px-3 py-2.5 text-right font-medium">
                        Approved intake
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium">
                        2025 seats
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium">
                        Allotted
                      </th>
                      <th className="px-5 py-2.5 text-right font-medium">
                        Vacant
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {branches.map((branch) => (
                      <tr key={branch.id} className="hover:bg-muted/25">
                        <td className="px-5 py-3">
                          <div className="flex items-start gap-2">
                            <Badge variant="mono" className="mt-0.5 shrink-0">
                              {branch.branchCode}
                            </Badge>
                            <div>
                              <p className="max-w-[24rem] font-medium leading-snug">
                                {branch.branchName}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {branch.nba
                                  ? `NBA accredited${branch.nbaValidUpto ? ` to ${branch.nbaValidUpto}` : ""}`
                                  : "NBA status not reported"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                          {formatNumber(branch.approvedIntake)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono">
                          {formatNumber(branch.seats?.totalSeats)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                          {formatNumber(branch.seats?.allotted)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                          {formatNumber(branch.seats?.vacant)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">
                    2025 closing cutoffs
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Cutoff mark out of 200 · general rank below each mark.
                  </p>
                </div>
                <Badge variant="outline">Community-wise</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-left text-[12px]">
                  <thead className="border-b border-border bg-surface/60 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Branch</th>
                      {COMMUNITIES.map((community) => (
                        <th
                          key={community}
                          className="px-2 py-2.5 text-right font-medium"
                          title={COMMUNITY_LABELS[community]}
                        >
                          {community}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {branches.map((branch) => (
                      <tr key={branch.id} className="hover:bg-muted/25">
                        <td className="px-5 py-3">
                          <div className="flex items-start gap-2">
                            <Badge variant="mono" className="mt-0.5 shrink-0">
                              {branch.branchCode}
                            </Badge>
                            <span className="max-w-[19rem] font-medium leading-snug">
                              {branch.branchName}
                            </span>
                          </div>
                        </td>
                        {COMMUNITIES.map((community) => {
                          const cell = branch.cutoffs2025[community];
                          return (
                            <td
                              key={community}
                              className="px-2 py-3 text-right align-top"
                            >
                              {cell?.mark === null || cell?.mark === undefined ? (
                                <span className="text-muted-foreground/60">
                                  —
                                </span>
                              ) : (
                                <>
                                  <span className="font-mono font-semibold">
                                    {formatCutoff(cell.mark)}
                                  </span>
                                  <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                                    {cell.rank === null
                                      ? "rank n/r"
                                      : `#${formatNumber(cell.rank)}`}
                                  </span>
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-border px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">
                A dash means the community cutoff was not reported for that
                branch. Closing ranks are stored for 2025 only.
              </p>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">
                    Open category mark history
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Published OC cutoff marks, 2020–2025.
                  </p>
                </div>
                <Badge variant="outline">6 years</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[38rem] text-left text-[12px]">
                  <thead className="border-b border-border bg-surface/60 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Branch</th>
                      {CUTOFF_YEARS.map((year) => (
                        <th
                          key={year}
                          className="px-3 py-2.5 text-right font-medium"
                        >
                          {year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {branches.map((branch) => (
                      <tr key={branch.id} className="hover:bg-muted/25">
                        <td className="px-5 py-2.5">
                          <div className="flex items-start gap-2">
                            <Badge variant="mono" className="mt-0.5 shrink-0">
                              {branch.branchCode}
                            </Badge>
                            <span className="max-w-[19rem] leading-snug">
                              {branch.branchName}
                            </span>
                          </div>
                        </td>
                        {CUTOFF_YEARS.map((year) => (
                          <td
                            key={year}
                            className="px-3 py-2.5 text-right font-mono text-muted-foreground"
                          >
                            {formatCutoff(branch.ocHistory[year])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-border px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">
                Marks above 200 in the archived export were treated as rank
                values and excluded.
              </p>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Info className="size-4 text-primary" />
                At a glance
              </h2>
              <dl className="mt-2 divide-y divide-border">
                <FactRow label="TNEA code">
                  <span className="font-mono">{college.code}</span>
                </FactRow>
                <FactRow label="District">
                  {college.district ?? "Not reported"}
                </FactRow>
                <FactRow label="Type">{college.type}</FactRow>
                <FactRow label="Autonomy">
                  {college.autonomous === null
                    ? "Not reported"
                    : college.autonomous
                      ? "Autonomous"
                      : "No"}
                </FactRow>
                <FactRow label="Boys hostel">
                  <StatusBadge value={hostel?.boysAvailable ?? null} />
                </FactRow>
                <FactRow label="Girls hostel">
                  <StatusBadge value={hostel?.girlsAvailable ?? null} />
                </FactRow>
                <FactRow label="Transport">
                  <StatusBadge value={college.transportAvailable} />
                </FactRow>
              </dl>
            </Card>

            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Home className="size-4 text-primary" />
                Reported fees
              </h2>
              {fees ? (
                <dl className="mt-2 divide-y divide-border">
                  <FactRow label="Admission fee">
                    {fees.admissionFee === null
                      ? "Not reported"
                      : formatInr(fees.admissionFee)}
                  </FactRow>
                  <FactRow label="Establishment charges">
                    {fees.establishmentFee === null
                      ? "Not reported"
                      : formatInr(fees.establishmentFee)}
                  </FactRow>
                  <FactRow label="Transport range">
                    {fees.transportMinFee === null &&
                    fees.transportMaxFee === null ? (
                      "Not reported"
                    ) : (
                      <span className="font-mono">
                        {formatInr(fees.transportMinFee)} –{" "}
                        {formatInr(fees.transportMaxFee)}
                      </span>
                    )}
                  </FactRow>
                  <FactRow label="Tuition fee">Not reported</FactRow>
                </dl>
              ) : (
                <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                  No fee record was published for this college.
                </p>
              )}
              <p className="mt-3 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
                From the 2023 college information record. Establishment charges
                are a hostel charge, not tuition or a full annual hostel cost.
              </p>
            </Card>

            <Card className="border-primary/20 bg-accent/30 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-primary" />
                How to read this page
              </h2>
              <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <Users className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  Cutoffs are published closing marks, never estimates.
                </li>
                <li className="flex gap-2">
                  <Bus className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  2025 ranks are shown separately from earlier marks.
                </li>
                <li className="flex gap-2">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  Missing values say Not reported. Placements and NAAC grades
                  are not in this dataset.
                </li>
              </ul>
            </Card>
          </aside>
        </div>
      </section>
    </>
  );
}

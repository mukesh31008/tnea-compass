import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bus,
  ChevronRight,
  ClipboardPlus,
  FileWarning,
  GraduationCap,
  Home,
  Info,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { AddToChoice } from "@/components/add-to-choice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCollegeProfile } from "@/lib/db/queries";
import { reportIssueUrl, SITE_URL } from "@/lib/site";
import { COMMUNITIES, COMMUNITY_LABELS } from "@/lib/tnea";
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
    alternates: { canonical: `/colleges/${profile.college.code}` },
    openGraph: {
      title: `${profile.college.shortName ?? profile.college.name} (${profile.college.code})`,
      description: `${shortCollegeName(profile.college.name, 140)} — published TNEA cutoffs, seats and reported facilities.`,
      url: `/colleges/${profile.college.code}`,
      type: "website",
    },
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollegeOrUniversity",
        "@id": `${SITE_URL}/colleges/${college.code}#college`,
        name: college.name,
        alternateName: college.shortName ?? undefined,
        identifier: college.code,
        url: `${SITE_URL}/colleges/${college.code}`,
        address: college.district
          ? {
              "@type": "PostalAddress",
              addressLocality: college.district,
              addressRegion: "Tamil Nadu",
              addressCountry: "IN",
            }
          : undefined,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Colleges",
            item: `${SITE_URL}/colleges`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: college.name,
            item: `${SITE_URL}/colleges/${college.code}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className="container-page flex flex-wrap items-center gap-1.5 pt-5 text-[11.5px] text-muted-foreground print-hidden"
      >
        <Link href="/" className="transition-colors hover:text-primary">
          Home
        </Link>
        <ChevronRight className="size-3" />
        <Link href="/colleges" className="transition-colors hover:text-primary">
          Colleges
        </Link>
        <ChevronRight className="size-3" />
        <span aria-current="page" className="truncate text-foreground/80">
          {college.code} · {college.shortName ?? college.name}
        </span>
      </nav>
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
            { label: "Programmes", value: formatNumber(totals.branches) },
            {
              label: "2026 seats",
              value:
                totals.seatRows2026 === 0
                  ? "Not reported"
                  : formatNumber(totals.seats2026),
              caption:
                totals.seatRows2026 === 0
                  ? "No 2026 seat row"
                  : `${totals.seatRows2026} of ${totals.branches} programmes`,
              missing: totals.seatRows2026 === 0,
            },
            {
              label: "2026 vacancies",
              value:
                totals.vacancies2026 === 0
                  ? "Not reported"
                  : formatNumber(totals.vacancies2026),
              caption: "After Round 3",
              missing: totals.vacancies2026 === 0,
            },
            {
              label: "2025 seats",
              value:
                totals.seatRows === 0
                  ? "Not reported"
                  : formatNumber(totals.seats2025),
              caption:
                totals.seatRows === 0
                  ? "No 2025 seat row"
                  : `${totals.seatRows} of ${totals.branches} programmes`,
              missing: totals.seatRows === 0,
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-card px-4 py-3">
              <p
                className={
                  stat.missing
                    ? "text-[12px] font-medium text-muted-foreground"
                    : "font-mono text-lg font-semibold tracking-tight"
                }
              >
                {stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              {stat.caption && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {stat.caption}
                </p>
              )}
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
                    Approved intake from the branch record. Seat totals are the
                    official 2026 matrix; vacancies are the post-Round-3 statement.
                  </p>
                </div>
                <Badge variant="mono">{branches.length} branches</Badge>
              </div>

              <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable table">
                <table className="mobile-sticky-first w-full min-w-[42rem] text-left text-[12px]">
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
                        2026 seats
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium">
                        2026 vacancies
                      </th>
                      <th className="px-5 py-2.5 text-right font-medium">
                        List
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
                        <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                          {formatNumber(branch.seats2025?.totalSeats)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono">
                          {formatNumber(branch.seats2026?.totalSeats)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                          {formatNumber(branch.vacancies2026)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {(() => {
                            const close =
                              branch.cutoffs2026.OC ?? branch.cutoffs2025.OC;
                            const year = branch.cutoffs2026.OC ? 2026 : 2025;
                            const trackHref = `/tracker/applications?${new URLSearchParams(
                              {
                                collegeCode: college.code,
                                collegeName: college.name,
                                branchCode: branch.branchCode,
                                branchName: branch.branchName,
                              },
                            ).toString()}`;
                            return (
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={trackHref}
                                  aria-label={`Track an application for ${branch.branchName}`}
                                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                                >
                                  <ClipboardPlus className="size-3.5" />
                                </Link>
                                <AddToChoice
                                  iconOnly
                                  input={{
                                    id: branch.id,
                                    collegeCode: college.code,
                                    collegeName: college.name,
                                    collegeShortName: college.shortName,
                                    district: college.district,
                                    type: college.type,
                                    branchCode: branch.branchCode,
                                    branchName: branch.branchName,
                                    community: "OC",
                                    dataYear: year,
                                    cutoffMark: close?.mark ?? null,
                                    rank: close?.rank ?? null,
                                  }}
                                />
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totals.seatRows2026 < totals.branches && (
                <p className="border-t border-border px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">
                  {totals.branches - totals.seatRows2026} of{" "}
                  {totals.branches} programmes have no 2026 seat row and are
                  shown as missing, not zero.
                </p>
              )}
            </Card>

            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">
                    2026 R3 cumulative closing cutoffs
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Last-ranked allotment across R1–R3 · grouped by the
                    community the seat was allotted against.
                  </p>
                </div>
                <Badge variant="success">Official 2026</Badge>
              </div>

              <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable table">
                <table className="mobile-sticky-first w-full min-w-[52rem] text-left text-[12px]">
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
                            <span className="max-w-[17rem] font-medium leading-snug">
                              {branch.branchName}
                            </span>
                          </div>
                        </td>
                        {COMMUNITIES.map((community) => {
                          const cell = branch.cutoffs2026[community];
                          return (
                            <td
                              key={community}
                              className="px-2 py-3 text-right align-top"
                            >
                              {cell?.mark === null || cell?.mark === undefined ? (
                                <span className="text-muted-foreground">
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
                                      : `#${formatNumber(cell.rank)}${cell.rankSuffix ?? ""}`}
                                  </span>
                                  <span className="block font-mono text-[9px] text-muted-foreground">
                                    R{cell.sourceRound ?? "?"} · p
                                    {cell.sourcePage ?? "?"}
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
                A dash means the programme did not report a close for that
                allotted community. R and p identify the PDF round and page of
                the last-ranked allotment.
              </p>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">
                    2026 Open category round timeline
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Cumulative close after each round. A later round can only
                    move the close to a higher rank number.
                  </p>
                </div>
                <Badge variant="outline">R1 → R3</Badge>
              </div>
              <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable table">
                <table className="mobile-sticky-first w-full min-w-[38rem] text-left text-[12px]">
                  <thead className="border-b border-border bg-surface/60 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Branch</th>
                      {[1, 2, 3].map((round) => (
                        <th
                          key={round}
                          className="px-3 py-2.5 text-right font-medium"
                        >
                          After R{round}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {branches.map((branch) => {
                      const rounds = branch.rounds2026.OC ?? [];
                      return (
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
                          {[1, 2, 3].map((roundNumber) => {
                            const round = rounds.find(
                              (item) => item.round === roundNumber,
                            );
                            return (
                              <td
                                key={roundNumber}
                                className="px-3 py-2.5 text-right font-mono text-muted-foreground"
                              >
                                {round?.mark === null || round?.mark === undefined ? (
                                  "—"
                                ) : (
                                  <>
                                    <span className="block font-semibold text-foreground">
                                      {formatCutoff(round.mark)}
                                    </span>
                                    <span className="text-[10px]">
                                      {round.rank === null
                                        ? "rank n/r"
                                        : `#${formatNumber(round.rank)}${round.rankSuffix ?? ""}`}
                                    </span>
                                  </>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">
                    2025 candidate-community cutoffs
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Context from the previous year. 2025 groups by the
                    candidate&apos;s community, not the allotted community.
                  </p>
                </div>
                <Badge variant="outline">2025 context</Badge>
              </div>

              <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable table">
                <table className="mobile-sticky-first w-full min-w-[44rem] text-left text-[12px]">
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
                                <span className="text-muted-foreground">
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
                branch. Closing ranks are published for 2025 and 2026 only.
              </p>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">
                    Open category mark history
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Published OC cutoff marks, 2020–2025. 2026 is shown separately above because its grouping is different.
                  </p>
                </div>
                <Badge variant="outline">6 years</Badge>
              </div>
              <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable table">
                <table className="mobile-sticky-first w-full min-w-[38rem] text-left text-[12px]">
                  <thead className="border-b border-border bg-surface/60 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Branch</th>
                      {[2020, 2021, 2022, 2023, 2024, 2025].map((year) => (
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
                        {[2020, 2021, 2022, 2023, 2024, 2025].map((year) => (
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
                From the archived TNEA all-years export. Marks above 200 in that
                export were rank-like values and were excluded. 2020–2024 ranks
                are not published in this dataset.
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
                    2025 and 2026 closes are shown separately from earlier marks;
                  2026 groups by the allotted community.
                </li>
                <li className="flex gap-2">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  Missing values say Not reported. Placements and NAAC grades
                  are not in this dataset.
                </li>
              </ul>
              <a
                href={reportIssueUrl({
                  kind: "data",
                  collegeCode: college.code,
                })}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 border-t border-primary/15 pt-3 text-[11px] font-medium text-primary hover:underline"
              >
                <FileWarning className="size-3.5" />
                Report an error for this college
              </a>
            </Card>
          </aside>
        </div>
      </section>
    </>
  );
}

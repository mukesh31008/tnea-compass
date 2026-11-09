import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cache } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  GitCompareArrows,
  Info,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { ComparePicker } from "@/components/compare-picker";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getCollegeProfile,
  getCompareSuggestions,
  type CollegeProfile,
} from "@/lib/db/queries";
import { formatCutoff, formatInr, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Compare colleges",
  description:
    "Put up to four Tamil Nadu engineering colleges side by side: 2026 cutoffs, seats, hostels and reported fees.",
};

export const dynamic = "force-dynamic";

const MAX_COLLEGES = 4;

type SearchParams = Record<string, string | string[] | undefined>;

const loadProfile = cache(getCollegeProfile);

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeCode(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{1,4}$/.test(trimmed)) return trimmed.padStart(4, "0");
  return /^[A-Za-z0-9]{1,8}$/.test(trimmed) ? trimmed.toUpperCase() : null;
}

function readCodes(value: string | string[] | undefined): string[] {
  const raw = first(value);
  if (!raw) return [];

  const seen = new Set<string>();
  const codes: string[] = [];
  for (const part of raw.split(",")) {
    const code = normalizeCode(part);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
    if (codes.length === MAX_COLLEGES) break;
  }
  return codes;
}

function StatusBadge({ value }: { value: boolean | null }) {
  if (value === null) return <Badge variant="outline">Not reported</Badge>;
  return (
    <Badge variant={value ? "success" : "outline"}>
      {value ? "Available" : "Not available"}
    </Badge>
  );
}

function transportLabel(fees: CollegeProfile["fees"]): ReactNode {
  if (!fees) return "Not reported";
  const { transportMinFee: min, transportMaxFee: max } = fees;
  if (min === null && max === null) return "Not reported";
  if (min !== null && max !== null) {
    return (
      <span className="font-mono">
        {formatInr(min)} – {formatInr(max)}
      </span>
    );
  }
  return formatInr(min ?? max);
}

function seatCell(
  profile: CollegeProfile,
  value: number,
  year: 2025 | 2026,
): ReactNode {
  const rows =
    year === 2026 ? profile.totals.seatRows2026 : profile.totals.seatRows;
  if (rows === 0) return "Not reported";
  return (
    <>
      <span className="font-mono">{formatNumber(value)}</span>
      <span className="mt-0.5 block text-[10px] text-muted-foreground">
        {rows} of {profile.totals.branches} programmes
      </span>
    </>
  );
}

type CompareRow = {
  label: string;
  value: (profile: CollegeProfile) => ReactNode;
};

const OVERVIEW_ROWS: CompareRow[] = [
  { label: "District", value: (p) => p.college.district ?? "Not reported" },
  { label: "College type", value: (p) => p.college.type },
  {
    label: "Autonomy",
    value: (p) =>
      p.college.autonomous === null
        ? "Not reported"
        : p.college.autonomous
          ? "Autonomous"
          : "Non-autonomous",
  },
  {
    label: "Programmes",
    value: (p) => (
      <span className="font-mono">{formatNumber(p.totals.branches)}</span>
    ),
  },
  {
    label: "2026 seats",
    value: (p) => seatCell(p, p.totals.seats2026, 2026),
  },
  {
    label: "2026 vacancies",
    value: (p) =>
      p.totals.seatRows2026 === 0
        ? "Not reported"
        : formatNumber(p.totals.vacancies2026),
  },
  {
    label: "2025 seats (context)",
    value: (p) => seatCell(p, p.totals.seats2025, 2025),
  },
  {
    label: "Boys hostel",
    value: (p) => <StatusBadge value={p.hostel?.boysAvailable ?? null} />,
  },
  {
    label: "Girls hostel",
    value: (p) => <StatusBadge value={p.hostel?.girlsAvailable ?? null} />,
  },
  {
    label: "Transport",
    value: (p) => <StatusBadge value={p.college.transportAvailable} />,
  },
];

const FEE_ROWS: CompareRow[] = [
  {
    label: "Admission fee",
    value: (p) =>
      p.fees ? (
        p.fees.admissionFee === null ? (
          "Not reported"
        ) : (
          <span className="font-mono">{formatInr(p.fees.admissionFee)}</span>
        )
      ) : (
        "Not reported"
      ),
  },
  {
    label: "Establishment charges",
    value: (p) =>
      p.fees ? (
        p.fees.establishmentFee === null ? (
          "Not reported"
        ) : (
          <span className="font-mono">{formatInr(p.fees.establishmentFee)}</span>
        )
      ) : (
        "Not reported"
      ),
  },
  {
    label: "Transport range",
    value: (p) => transportLabel(p.fees),
  },
  { label: "Tuition fee", value: () => "Not reported" },
  {
    label: "Fee record year",
    value: (p) => (p.fees ? p.fees.year : "No fee record"),
  },
];

type SharedBranch = {
  key: string;
  code: string;
  name: string;
  offered: boolean[];
  marks: (number | null)[];
  ranks: (number | null)[];
  offers: number;
};

function bestMark(branch: SharedBranch): number {
  return Math.max(
    ...branch.marks.filter((mark): mark is number => mark !== null),
    -1,
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const codes = readCodes(params.colleges);

  const loaded = await Promise.all(codes.map((code) => loadProfile(code)));
  const profiles = loaded.filter(
    (profile): profile is CollegeProfile => profile !== null,
  );
  const missingCodes = codes.filter((_, index) => loaded[index] === null);

  const selected = codes.map((code, index) => {
    const profile = loaded[index];
    return {
      code,
      name:
        profile === null
          ? `Code ${code} not in dataset`
          : (profile.college.shortName ?? profile.college.name),
      district: profile?.college.district ?? null,
    };
  });

  const suggestions =
    profiles.length === 0 ? await getCompareSuggestions() : [];

  const branchMap = new Map<string, SharedBranch>();
  profiles.forEach((profile, collegeIndex) => {
    const seen = new Set<string>();
    for (const branch of profile.branches) {
      const key = `${branch.branchCode}::${branch.branchName}`;
      let entry = branchMap.get(key);
      if (!entry) {
        entry = {
          key,
          code: branch.branchCode,
          name: branch.branchName,
          offered: profiles.map(() => false),
          marks: profiles.map(() => null),
          ranks: profiles.map(() => null),
          offers: 0,
        };
        branchMap.set(key, entry);
      }
      entry.offered[collegeIndex] = true;
      if (!seen.has(key)) {
        entry.offers += 1;
        seen.add(key);
      }
      const oc = branch.cutoffs2026.OC;
      if (oc && oc.mark !== null && oc.mark !== undefined) {
        entry.marks[collegeIndex] = oc.mark;
        entry.ranks[collegeIndex] = oc.rank ?? null;
      }
    }
  });

  const minimumOffers = profiles.length === 1 ? 1 : 2;
  const sharedBranches = [...branchMap.values()]
    .filter(
      (branch) =>
        branch.offers >= minimumOffers &&
        branch.marks.some((mark) => mark !== null),
    )
    .sort(
      (a, b) =>
        b.offers - a.offers ||
        bestMark(b) - bestMark(a) ||
        a.name.localeCompare(b.name),
    );
  const shownBranches = sharedBranches.slice(0, 30);

  const pageHref = (nextCodes: string[]) =>
    nextCodes.length > 0
      ? `/compare?colleges=${nextCodes.join(",")}`
      : "/compare";

  return (
    <>
      <PageHeader
        eyebrow="Compare"
        title="Put the record side by side"
        description="Compare published 2026 cutoffs, seats, hostels and reported fees for up to four colleges. Nothing is estimated or filled in."
        actions={
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <GitCompareArrows className="size-3.5 text-primary" />
            {profiles.length > 0
              ? `${profiles.length} of ${MAX_COLLEGES} selected`
              : "Up to 4 colleges"}
          </Badge>
        }
      />

      <section className="container-page py-8 md:py-10">
        <ComparePicker selected={selected} />

        {missingCodes.length > 0 && (
          <Card className="mt-4 border-warning/30 bg-warning/5 p-4 text-[13px]">
            <span className="font-medium text-foreground">
              Not in the dataset:
            </span>{" "}
            <span className="font-mono">{missingCodes.join(", ")}</span>. TNEA
            codes are four digits, for example{" "}
            <Link href="/compare?colleges=0001" className="font-mono underline">
              0001
            </Link>{" "}
            for CEG. Remove the code above or{" "}
            <Link href="/colleges" className="font-medium underline">
              find it in the explorer
            </Link>
            .
          </Card>
        )}

        {profiles.length === 0 ? (
          <Card className="mt-6 overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="size-4 text-primary" />
                Start with a college
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                These suggestions are ordered by programme count, not by
                quality.
              </p>
            </div>
            {suggestions.length > 0 ? (
              <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((college) => (
                  <Link
                    key={college.code}
                    href={pageHref([college.code])}
                    className="group flex flex-col gap-2 bg-card p-4 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="mono">{college.code}</Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatNumber(college.branchCount)} programmes
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[13px] font-medium leading-snug transition-colors group-hover:text-primary">
                      {college.shortName ?? college.name}
                    </p>
                    <p className="mt-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="size-3" />
                      {college.district ?? "District not reported"}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Search above to add a college, or browse the full record.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/colleges">Open the college explorer</Link>
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <>
            <Card className="mt-6 overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold">At a glance</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Seat totals are the published 2026 matrix. Vacancies are the
                  post-Round-3 statement. A dash or “Not reported” is a missing
                  record, never a zero.
                </p>
              </div>
              <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable table">
                <table className="w-full min-w-[46rem] text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-border bg-surface/60">
                      <th
                        scope="col"
                        className="sticky left-0 z-10 min-w-[9rem] bg-surface px-4 py-3 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
                      >
                        Attribute
                      </th>
                      {profiles.map((profile) => (
                        <th
                          key={profile.college.code}
                          scope="col"
                          className="min-w-[13rem] border-l border-border px-4 py-3 align-top font-medium"
                        >
                          <Link
                            href={`/colleges/${profile.college.code}`}
                            className="group block"
                          >
                            <Badge variant="mono">{profile.college.code}</Badge>
                            <span className="mt-1.5 block line-clamp-2 text-[12px] font-semibold leading-snug transition-colors group-hover:text-primary">
                              {profile.college.shortName ?? profile.college.name}
                            </span>
                            <span className="mt-1 flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
                              Open profile
                              <ArrowRight className="size-3" />
                            </span>
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {OVERVIEW_ROWS.map((row) => (
                      <tr key={row.label} className="hover:bg-muted/20">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground"
                        >
                          {row.label}
                        </th>
                        {profiles.map((profile) => (
                          <td
                            key={profile.college.code}
                            className="border-l border-border px-4 py-2.5 align-top text-[12px]"
                          >
                            {row.value(profile)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="mt-4 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">Reported fees</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    From the 2023 college information record. Missing tuition is
                    not inferred from other colleges.
                  </p>
                </div>
                <Badge variant="outline">2023 record</Badge>
              </div>
              <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable table">
                <table className="w-full min-w-[46rem] text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-border bg-surface/60">
                      <th
                        scope="col"
                        className="sticky left-0 z-10 min-w-[9rem] bg-surface px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
                      >
                        Fee
                      </th>
                      {profiles.map((profile) => (
                        <th
                          key={profile.college.code}
                          scope="col"
                          className="border-l border-border px-4 py-2.5 text-[11px] font-medium"
                        >
                          {profile.college.shortName ?? profile.college.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {FEE_ROWS.map((row) => (
                      <tr key={row.label} className="hover:bg-muted/20">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground"
                        >
                          {row.label}
                        </th>
                        {profiles.map((profile) => (
                          <td
                            key={profile.college.code}
                            className="border-l border-border px-4 py-2.5 align-top text-[12px]"
                          >
                            {row.value(profile)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-border px-5 py-3 text-[10px] leading-relaxed text-muted-foreground">
                Establishment charges are the reported hostel establishment
                fee, not tuition and not a full annual hostel cost.
              </p>
            </Card>

            <Card className="mt-4 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">
                    2026 OC closing marks by{" "}
                    {profiles.length === 1 ? "branch" : "shared branch"}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {profiles.length === 1
                      ? "Branches with a published Open category closing mark."
                      : "Branches offered by at least two selected colleges."}{" "}
                    Higher marks are more competitive in this record.
                  </p>
                </div>
                <Badge variant="mono">
                  {formatNumber(sharedBranches.length)} branches
                </Badge>
              </div>

              {shownBranches.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No shared programme has a published 2026 Open category
                    mark. The overview above still compares the colleges.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable table">
                  <table className="w-full min-w-[46rem] text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-border bg-surface/60">
                        <th
                          scope="col"
                          className="sticky left-0 z-10 min-w-[14rem] bg-surface px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
                        >
                          Branch
                        </th>
                        {profiles.map((profile) => (
                          <th
                            key={profile.college.code}
                            scope="col"
                            className="border-l border-border px-4 py-2.5 text-right text-[11px] font-medium"
                          >
                            {profile.college.shortName ?? profile.college.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {shownBranches.map((branch) => (
                        <tr key={branch.key} className="hover:bg-muted/20">
                          <th
                            scope="row"
                            className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-normal"
                          >
                            <div className="flex items-start gap-2">
                              <Badge variant="mono" className="mt-0.5 shrink-0">
                                {branch.code}
                              </Badge>
                              <span className="max-w-[22rem] text-[12px] font-medium leading-snug">
                                {branch.name}
                              </span>
                            </div>
                          </th>
                          {profiles.map((profile, index) => {
                            const mark = branch.marks[index];
                            const rank = branch.ranks[index];
                            return (
                              <td
                                key={profile.college.code}
                                className="border-l border-border px-4 py-3 text-right align-top"
                                title={
                                  branch.offered[index]
                                    ? mark === null
                                      ? "Open category mark not reported"
                                      : undefined
                                    : "Branch not offered by this college"
                                }
                              >
                                {!branch.offered[index] || mark === null ? (
                                  <span className="text-muted-foreground/60">
                                    —
                                  </span>
                                ) : (
                                  <>
                                    <span className="font-mono font-semibold">
                                      {formatCutoff(mark)}
                                    </span>
                                    <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                                      {rank === null
                                        ? "rank n/r"
                                        : `#${formatNumber(rank)}`}
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
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-[10px] text-muted-foreground">
                <span>
                  {shownBranches.length < sharedBranches.length
                    ? `Showing the first 30 of ${formatNumber(sharedBranches.length)} branches.`
                    : "All qualifying branches are shown."}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Info className="size-3.5" />
                  Ranks are published for 2025 and 2026.
                </span>
              </div>
            </Card>

            <Card className="mt-4 border-primary/20 bg-accent/30 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-primary" />
                How to read this comparison
              </h2>
              <div className="mt-3 grid gap-3 text-[11px] leading-relaxed text-muted-foreground sm:grid-cols-3">
                <p>
                  <span className="font-medium text-foreground">
                    Same year, same rule:
                  </span>{" "}
                  every cutoff is a published 2026 closing mark, grouped by the
                  community the seat was allotted against. Earlier years are not
                  mixed in.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Missing stays missing:
                  </span>{" "}
                  a blank fee or hostel value is not treated as zero, and no
                  college is filled in from another.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Not a ranking:
                  </span>{" "}
                  higher marks show stronger demand in this record, not a
                  judgement about teaching or placements.
                </p>
              </div>
            </Card>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Comparing{" "}
                {profiles.map((profile) => profile.college.code).join(" · ")}
              </p>
              <div className="flex gap-2">
                {profiles[0] && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/colleges/${profiles[0].college.code}`}>
                      Back to {profiles[0].college.shortName ?? "profile"}
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href="/compare">Clear comparison</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}

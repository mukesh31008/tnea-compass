import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Info,
  SearchX,
  TrendingUp,
} from "lucide-react";

import { CutoffFilters } from "@/components/cutoff-filters";
import { CutoffSparkline } from "@/components/cutoff-sparkline";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getBranchOptions,
  getCutoffExplorer,
  getDistrictOptions,
} from "@/lib/db/queries";
import {
  communityLabel,
  CUTOFF_YEARS,
  isCommunity,
  type Community,
} from "@/lib/tnea";
import { formatCutoff, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cutoff trends",
  description:
    "Browse published TNEA cutoff marks from 2020 to 2026, with 2025 and 2026 closing ranks, by branch, community, district and college.",
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(params: SearchParams, page: number): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const item = first(value);
    if (item && key !== "page") next.set(key, item);
  }
  if (page > 1) next.set("page", String(page));
  const query = next.toString();
  return query ? `/cutoffs?${query}` : "/cutoffs";
}

export default async function CutoffsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const yearParam = Number(first(params.year) ?? "2026");
  const year = (CUTOFF_YEARS as readonly number[]).includes(yearParam)
    ? yearParam
    : 2026;

  const communityParam = first(params.community) ?? "OC";
  const community: Community = isCommunity(communityParam)
    ? communityParam
    : "OC";

  const branchParam = first(params.branch);
  const branch =
    branchParam === "all" ? undefined : branchParam === undefined ? "CS" : branchParam;
  const district = first(params.district) || undefined;
  const q = first(params.q)?.trim() || undefined;
  const pageParam = Number(first(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [districts, branches, results] = await Promise.all([
    getDistrictOptions(),
    getBranchOptions(),
    getCutoffExplorer({
      year,
      community,
      branch,
      district,
      q,
      page,
      limit: 25,
    }),
  ]);

  const pageNumbers: number[] = [];
  const start = Math.max(1, results.page - 2);
  const end = Math.min(results.pages, results.page + 2);
  for (let value = start; value <= end; value += 1) pageNumbers.push(value);

  const branchName = branch
    ? branches.find((item) => item.code === branch)?.name
    : "All branches";

  const limit = 25;
  const offset = (results.page - 1) * limit;

  return (
    <>
      <PageHeader
        eyebrow="Cutoffs"
        title="Closing marks, without the guesswork"
        description="Read published TNEA cutoff marks from 2020 to 2026. Compare branches and communities, follow a programme's year trend, and open the 2026 round-by-round close."
        actions={
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <BarChart3 className="size-3.5 text-primary" />
            2025 &amp; 2026 ranks included
          </Badge>
        }
      />

      <section className="container-page py-8 md:py-10">
        <CutoffFilters
          districts={districts}
          branches={branches}
          year={year}
          community={community}
          branch={branch ?? null}
          district={district ?? null}
          query={q ?? null}
        />

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
          {[
            ["Highest mark", formatCutoff(results.summary.highest)],
            [
              "Average mark",
              results.summary.average === null
                ? "—"
                : results.summary.average.toFixed(1),
            ],
            ["Programmes", formatNumber(results.summary.programmes)],
            ["Reading", `${year} · ${community}`],
          ].map(([label, value]) => (
            <div key={label} className="bg-card px-4 py-3">
              <p className="font-mono text-lg font-semibold tracking-tight">
                {value}
              </p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            {communityLabel(community)} · {branchName}
            {district ? ` · ${district}` : ""}
          </span>
          <span>
            Marks out of 200.{" "}
            {results.communityBasis === "allotted"
              ? "2026 groups by the community the seat was allotted against."
              : "Ranks are published for 2025 and 2026."}
          </span>
        </div>

        {results.rows.length === 0 ? (
          <Card className="mt-4 flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
              <SearchX className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">
              No cutoff rows for this combination
            </h2>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
              That branch, community, year or district may not have a published
              mark. Try another branch or clear the district filter.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-5">
              <Link href="/cutoffs">Reset filters</Link>
            </Button>
          </Card>
        ) : (
          <Card className="mt-4 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">
                  {year} {community} closing marks
                </h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Sorted high to low · {formatNumber(results.total)} programmes
                </p>
              </div>
              <Badge variant="mono">
                Showing {formatNumber(offset + 1)}–
                {formatNumber(offset + results.rows.length)} of{" "}
                {formatNumber(results.total)}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-left text-[12px]">
                <thead className="border-b border-border bg-surface/60 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-2.5 text-right font-medium">#</th>
                    <th className="px-4 py-2.5 font-medium">College</th>
                    <th className="px-3 py-2.5 font-medium">Branch</th>
                    <th className="px-3 py-2.5 text-right font-medium">Mark</th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      General rank
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      {year === 2026 ? "R1–R3" : "2020–2025"}
                    </th>
                    <th className="w-10 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.rows.map((row, index) => (
                    <tr key={row.collegeBranchId} className="hover:bg-muted/25">
                      <td className="px-3 py-3 text-right font-mono text-[11px] text-muted-foreground">
                        {offset + index + 1}
                      </td>
                      <td className="max-w-[19rem] px-4 py-3">
                        <div className="flex items-start gap-2">
                          <Badge variant="mono" className="mt-0.5 shrink-0">
                            {row.collegeCode}
                          </Badge>
                          <div className="min-w-0">
                            <Link
                              href={`/colleges/${row.collegeCode}`}
                              className="line-clamp-2 font-medium leading-snug hover:text-primary hover:underline"
                            >
                              {row.collegeShortName ?? row.collegeName}
                            </Link>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {row.district ?? "District not reported"} ·{" "}
                              {row.type}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[15rem] px-3 py-3">
                        <p className="line-clamp-2 leading-snug">
                          {row.branchName}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {row.branchCode}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[13px] font-semibold">
                        {formatCutoff(row.mark)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {row.rank !== null ? (
                          <span className="font-mono text-[12px]">
                            #{formatNumber(row.rank)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60">
                            —
                          </span>
                        )}
                        {year === 2026 && row.sourcePage !== null && (
                          <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                            R{row.sourceRound ?? "?"} · p{row.sourcePage}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {year === 2026 ? (
                          <CutoffSparkline
                            values={row.rounds.map((round) => round.mark)}
                            labels={row.rounds.map((round) => `R${round.round}`)}
                            label={`${row.collegeShortName ?? row.collegeName}, ${row.branchName}, ${community} cumulative close after each 2026 round`}
                          />
                        ) : (
                          <CutoffSparkline
                            values={row.history}
                            label={`${row.collegeShortName ?? row.collegeName}, ${row.branchName}, ${community} cutoff marks 2020 to 2025`}
                          />
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/colleges/${row.collegeCode}`}
                          aria-label={`Open ${row.collegeName}`}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ArrowRight className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-primary" />
                {year === 2026
                  ? "The sparkline follows the cumulative close after Rounds 1, 2 and 3."
                  : "The sparkline follows the same community across 2020–2025."}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Info className="size-3.5" />
                Missing years break the line.
              </span>
            </div>
          </Card>
        )}

        {results.pages > 1 && (
          <nav
            className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5"
            aria-label="Pagination"
          >
            {results.page > 1 ? (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href={buildHref(params, results.page - 1)}>
                  <ArrowLeft className="size-3.5" />
                  Previous
                </Link>
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-1">
              {pageNumbers.map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={buildHref(params, pageNumber)}
                  aria-current={pageNumber === results.page ? "page" : undefined}
                  className={
                    pageNumber === results.page
                      ? "grid size-8 place-items-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground"
                      : "grid size-8 place-items-center rounded-md text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                >
                  {pageNumber}
                </Link>
              ))}
            </div>

            {results.page < results.pages ? (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href={buildHref(params, results.page + 1)}>
                  Next
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </>
  );
}

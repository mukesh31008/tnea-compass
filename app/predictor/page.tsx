import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { PredictorForm } from "@/components/predictor-form";
import { AddToChoice } from "@/components/add-to-choice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getBranchOptions,
  getDistrictOptions,
  getPredictorCandidates,
} from "@/lib/db/queries";
import {
  BAND_META,
  BAND_ORDER,
  isValidCutoff,
  isValidRank,
  predictByCutoff,
  predictByRank,
  type PositionBand,
} from "@/lib/predictor";
import { communityLabel, isCommunity, type Community } from "@/lib/tnea";
import { formatCutoff, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Where you stand",
  description:
    "Compare your TNEA rank or cutoff mark with the published 2026 final close or the 2025 close. A distance reading, not an admission probability.",
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PredictorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const modeParam = first(params.mode) === "cutoff" ? "cutoff" : "rank";
  const rankRaw = first(params.rank)?.trim();
  const cutoffRaw = first(params.cutoff)?.trim();
  const rank = rankRaw ? Number(rankRaw) : null;
  const cutoff = cutoffRaw ? Number(cutoffRaw) : null;
  const validRank = rank !== null && isValidRank(rank);
  const validCutoff = cutoff !== null && isValidCutoff(cutoff);

  let activeMode: "rank" | "cutoff" = modeParam;
  if (activeMode === "rank" && !validRank && validCutoff) activeMode = "cutoff";
  if (activeMode === "cutoff" && !validCutoff && validRank) activeMode = "rank";

  const communityParam = first(params.community) ?? "OC";
  const community: Community = isCommunity(communityParam)
    ? communityParam
    : "OC";
  const branch = first(params.branch) || undefined;
  const district = first(params.district) || undefined;
  const yearParam = Number(first(params.year) ?? "2026");
  const year = yearParam === 2025 ? 2025 : 2026;

  const hasInput = Boolean(rankRaw || cutoffRaw);
  const error = hasInput
    ? activeMode === "rank" && !validRank
      ? "Enter a general rank between 1 and 3,00,000."
      : activeMode === "cutoff" && !validCutoff
        ? "Enter a cutoff mark between 0 and 200."
        : null
    : null;

  const [districts, branches] = await Promise.all([
    getDistrictOptions(),
    getBranchOptions(),
  ]);

  const candidates =
    hasInput && !error
      ? await getPredictorCandidates({ community, branch, district, year })
      : [];

  const predictions =
    hasInput && !error
      ? candidates
          .filter((candidate) =>
            activeMode === "rank"
              ? candidate.rank !== null
              : candidate.mark !== null,
          )
          .map((candidate) => ({
            ...candidate,
            prediction:
              activeMode === "rank"
                ? predictByRank(rank as number, candidate.rank as number)
                : predictByCutoff(cutoff as number, candidate.mark as number),
          }))
      : [];

  predictions.sort((a, b) => {
    const band = BAND_ORDER[a.prediction.band] - BAND_ORDER[b.prediction.band];
    if (band !== 0) return band;
    if (activeMode === "rank") {
      return (a.rank ?? Number.POSITIVE_INFINITY) -
        (b.rank ?? Number.POSITIVE_INFINITY);
    }
    return (
      (b.mark ?? Number.NEGATIVE_INFINITY) -
        (a.mark ?? Number.NEGATIVE_INFINITY) ||
      (a.rank ?? Number.POSITIVE_INFINITY) -
        (b.rank ?? Number.POSITIVE_INFINITY)
    );
  });

  const bandCounts = new Map<PositionBand, number>();
  for (const prediction of predictions) {
    bandCounts.set(
      prediction.prediction.band,
      (bandCounts.get(prediction.prediction.band) ?? 0) + 1,
    );
  }

  const pageParam = Number(first(params.page) ?? "1");
  const limit = 25;
  const pages = Math.max(1, Math.ceil(predictions.length / limit));
  const page =
    Number.isFinite(pageParam) && pageParam > 0
      ? Math.min(Math.floor(pageParam), pages)
      : 1;
  const offset = (page - 1) * limit;
  const rows = predictions.slice(offset, offset + limit);

  const branchName = branch
    ? (branches.find((item) => item.code === branch)?.name ?? branch)
    : "All branches";

  const resultParams = new URLSearchParams();
  resultParams.set("mode", activeMode);
  if (activeMode === "rank" && rank !== null) {
    resultParams.set("rank", String(rank));
  }
  if (activeMode === "cutoff" && cutoff !== null) {
    resultParams.set("cutoff", String(cutoff));
  }
  resultParams.set("community", community);
  resultParams.set("year", String(year));
  if (branch) resultParams.set("branch", branch);
  if (district) resultParams.set("district", district);

  const hrefForPage = (pageNumber: number) => {
    const next = new URLSearchParams(resultParams.toString());
    if (pageNumber > 1) next.set("page", String(pageNumber));
    return `/predictor?${next.toString()}`;
  };

  const inputLabel =
    activeMode === "rank" && rank !== null
      ? `Rank ${formatNumber(rank)}`
      : cutoff !== null
        ? `Cutoff ${formatCutoff(cutoff)}`
        : "";

  return (
    <>
      <PageHeader
        eyebrow="Position"
        title="Where do you stand?"
        description={`Compare your rank or cutoff with the published ${year} closing values. The result is a distance reading, not an admission probability.`}
        actions={
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <Sparkles className="size-3.5 text-primary" />
            {year} closing data
          </Badge>
        }
      />

      <section className="container-page py-8 md:py-10">
        <PredictorForm
          mode={activeMode}
          community={community}
          branch={branch ?? null}
          district={district ?? null}
          rank={rankRaw ?? ""}
          cutoff={cutoffRaw ?? ""}
          year={year}
          districts={districts}
          branches={branches}
        />

        {error && (
          <Card className="mt-4 border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </Card>
        )}

        {!hasInput && !error && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Search,
                title: "Enter one position",
                body: "Use your TNEA general rank or your cutoff mark. You do not need both, and nothing is stored.",
              },
              {
                icon: TrendingUp,
                title: `Compare the ${year} close`,
                body:
                  year === 2026
                    ? "Every programme is checked against its final cumulative 2026 close, grouped by the community the seat was allotted against."
                    : "Every programme is checked against its published 2025 closing rank or closing mark for your community.",
              },
              {
                icon: ShieldCheck,
                title: "Read the band honestly",
                body: "Bands show distance from the last published value. They do not promise a seat or predict 2026 counselling.",
              },
            ].map((item) => (
              <Card key={item.title} className="p-5">
                <item.icon className="size-5 text-primary" />
                <h2 className="mt-3 text-sm font-semibold">{item.title}</h2>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </Card>
            ))}
          </div>
        )}

        {hasInput && !error && (
          <>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Your reading
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  {inputLabel} · {community} · {branchName}
                  {district ? ` · ${district}` : ""}
                </h2>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {communityLabel(community)} ·{" "}
                  {formatNumber(predictions.length)} programmes with a {year}
                  {" "}closing value
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href={`/predictor?mode=${activeMode}`}>
                  Start over
                </Link>
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  "comfortable",
                  "likely",
                  "borderline",
                  "stretch",
                  "unlikely",
                ] as PositionBand[]
              ).map((band) => (
                <Card key={band} className="px-3 py-2.5">
                  <p className="font-mono text-lg font-semibold">
                    {formatNumber(bandCounts.get(band) ?? 0)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {BAND_META[band].label}
                  </p>
                </Card>
              ))}
            </div>

            {rows.length === 0 ? (
              <Card className="mt-4 flex flex-col items-center justify-center px-6 py-16 text-center">
                <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Info className="size-6" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">
                  No {year} rows for these filters
                </h2>
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Try another branch or district, or switch to a different
                  community.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-5">
                  <Link href={`/predictor?mode=${activeMode}`}>
                    Change filters
                  </Link>
                </Button>
              </Card>
            ) : (
              <Card className="mt-4 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold">
                      Comparison with {year} closing values
                    </h2>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Strongest signals first, then the most competitive
                      programmes within each band.
                    </p>
                  </div>
                  <Badge variant="mono">
                    Showing {formatNumber(offset + 1)}–
                    {formatNumber(offset + rows.length)} of{" "}
                    {formatNumber(predictions.length)}
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[54rem] text-left text-[12px]">
                    <thead className="border-b border-border bg-surface/60 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">College</th>
                        <th className="px-3 py-2.5 font-medium">Branch</th>
                        <th className="px-3 py-2.5 text-right font-medium">
                          {year} close
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium">
                          Your margin
                        </th>
                        <th className="px-4 py-2.5 text-right font-medium">
                          Reading
                        </th>
                        <th className="px-4 py-2.5 text-right font-medium">
                          List
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((row) => (
                        <tr
                          key={row.collegeBranchId}
                          className="hover:bg-muted/25"
                        >
                          <td className="max-w-[20rem] px-4 py-3">
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
                                  {row.district ?? "District not reported"}
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
                          <td className="px-3 py-3 text-right">
                            <span className="font-mono text-[12px] font-semibold">
                              {row.mark === null
                                ? "Not reported"
                                : formatCutoff(row.mark)}
                            </span>
                            <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                              {row.rank === null
                                ? "rank n/r"
                                : `#${formatNumber(row.rank)}`}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-[11px] text-muted-foreground">
                            {activeMode === "rank" ? (
                              row.prediction.advantage >= 0 ? (
                                <span className="text-success">
                                  {formatNumber(row.prediction.advantage)} inside
                                </span>
                              ) : (
                                <span>
                                  {formatNumber(-row.prediction.advantage)}{" "}
                                  outside
                                </span>
                              )
                            ) : row.prediction.advantage >= 0 ? (
                              <span className="text-success">
                                +{row.prediction.advantage.toFixed(1)} marks
                              </span>
                            ) : (
                              <span>
                                {row.prediction.advantage.toFixed(1)} marks
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span title={row.prediction.note}>
                              <Badge variant={BAND_META[row.prediction.band].tone}>
                                {row.prediction.label}
                              </Badge>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <AddToChoice
                              iconOnly
                              input={{
                                id: row.collegeBranchId,
                                collegeCode: row.collegeCode,
                                collegeName: row.collegeName,
                                collegeShortName: row.collegeShortName,
                                district: row.district,
                                type: row.type,
                                branchCode: row.branchCode,
                                branchName: row.branchName,
                                community,
                                dataYear: year,
                                cutoffMark: row.mark,
                                rank: row.rank,
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
                  <span>
                    “Inside” means your rank number is lower than the {year}{" "}
                    closing rank.
                  </span>
                  <span>Published values only. No estimate is invented.</span>
                </div>
              </Card>
            )}

            {pages > 1 && (
              <nav
                className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5"
                aria-label="Pagination"
              >
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <Link href={hrefForPage(page - 1)}>
                      <ArrowLeft className="size-3.5" />
                      Previous
                    </Link>
                  </Button>
                ) : (
                  <span />
                )}

                <span className="font-mono text-[12px] text-muted-foreground">
                  {page} / {pages}
                </span>

                {page < pages ? (
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <Link href={hrefForPage(page + 1)}>
                      Next
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                ) : (
                  <span />
                )}
              </nav>
            )}

            <Card id="bands" className="mt-8 border-primary/20 bg-accent/30 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-primary" />
                How the bands are calculated
              </h2>
              <div className="mt-3 grid gap-3 text-[11px] leading-relaxed text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                <p>
                  <span className="font-medium text-foreground">
                    Strong signal:
                  </span>{" "}
                  rank at least 20% inside the published close, or a mark 5+ above.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Favourable:
                  </span>{" "}
                  rank at or inside the close, or mark at or above it.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Borderline:
                  </span>{" "}
                  within 15% of the rank, or within 2 marks.
                </p>
                <p>
                  <span className="font-medium text-foreground">Stretch:</span>{" "}
                  within 40% of the rank, or 2–5 marks below.
                </p>
                <p>
                  <span className="font-medium text-foreground">Unlikely:</span>{" "}
                  further outside than the stretch threshold.
                </p>
                <p>
                  <span className="font-medium text-foreground">Important:</span>{" "}
                  {year === 2026
                    ? "2026 is the final cumulative close after Round 3, grouped by the community the seat was allotted against. 2024 ranks were a duplicate export and are not used."
                    : "2025 candidate-community closing values. 2024 ranks were a duplicate export and are not used."}
                </p>
              </div>
            </Card>
          </>
        )}
      </section>
    </>
  );
}

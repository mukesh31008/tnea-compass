import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  GraduationCap,
  MapPin,
  SearchX,
} from "lucide-react";

import { CollegeFilters } from "@/components/college-filters";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getBranchOptions,
  getDistrictOptions,
  searchColleges,
} from "@/lib/db/queries";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "College explorer",
  description:
    "Search and filter 478 Tamil Nadu engineering colleges by district, branch, type, hostel and autonomy.",
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
  return query ? `/colleges?${query}` : "/colleges";
}

export default async function CollegesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const district = first(params.district) || undefined;
  const branch = first(params.branch) || undefined;
  const type = first(params.type) || undefined;
  const hostelParam = first(params.hostel);
  const hostel =
    hostelParam === "boys" || hostelParam === "girls" || hostelParam === "any"
      ? hostelParam
      : undefined;
  const autonomousParam = first(params.autonomous);
  const autonomous =
    autonomousParam === "true"
      ? true
      : autonomousParam === "false"
        ? false
        : undefined;
  const pageParam = Number(first(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [districts, branches, results] = await Promise.all([
    getDistrictOptions(),
    getBranchOptions(),
    searchColleges({
      q,
      district,
      branch,
      type,
      hostel,
      autonomous,
      page,
      limit: 24,
    }),
  ]);

  const pageNumbers: number[] = [];
  const start = Math.max(1, results.page - 2);
  const end = Math.min(results.pages, results.page + 2);
  for (let value = start; value <= end; value += 1) pageNumbers.push(value);

  return (
    <>
      <PageHeader
        eyebrow="Explore"
        title="Find a college on the record"
        description="Search 478 institutions, then narrow by district, branch, hostel and autonomy. Every profile links back to its published cutoffs and seat data."
        actions={
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <Building2 className="size-3.5 text-primary" />
            {formatNumber(results.total)} matching
          </Badge>
        }
      />

      <section className="container-page py-8 md:py-10">
        <CollegeFilters districts={districts} branches={branches} />

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">
              {formatNumber(results.total)}
            </span>{" "}
            {results.total === 1 ? "college" : "colleges"}
            {q ? (
              <>
                {" "}
                matching <span className="text-foreground">“{q}”</span>
              </>
            ) : null}
            {results.pages > 1 ? (
              <>
                {" "}
                · page {results.page} of {results.pages}
              </>
            ) : null}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Cutoffs and seats are published TNEA data, not predictions.
          </p>
        </div>

        {results.colleges.length === 0 ? (
          <Card className="mt-4 flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
              <SearchX className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">
              No colleges match these filters
            </h2>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Try a shorter search term, a different district, or remove the
              branch filter.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-5">
              <Link href="/colleges">Clear all filters</Link>
            </Button>
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.colleges.map((college) => (
              <Link
                key={college.code}
                href={`/colleges/${college.code}`}
                className="group block h-full"
              >
                <Card className="card-hover flex h-full flex-col p-5 hover:border-primary/25">
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant="mono">{college.code}</Badge>
                    <Badge variant="outline" className="max-w-[60%] truncate">
                      {college.type}
                    </Badge>
                  </div>

                  <h2 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
                    {college.name}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {college.district ?? "Not reported"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap className="size-3" />
                      {college.branchCount}{" "}
                      {college.branchCount === 1 ? "programme" : "programmes"}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <div className="flex flex-wrap gap-1.5">
                      {college.autonomous && (
                        <Badge variant="success">Autonomous</Badge>
                      )}
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
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

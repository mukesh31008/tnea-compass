"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { COMMUNITIES, COMMUNITY_LABELS, CUTOFF_YEARS, type Community } from "@/lib/tnea";

type DistrictOption = { district: string; colleges: number };
type BranchOption = { code: string; name: string; colleges: number };

function FilterSelect({
  label,
  name,
  value,
  onChange,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <select
        key={value}
        name={name}
        defaultValue={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-[13px] shadow-xs outline-none transition-colors focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20"
      >
        {children}
      </select>
    </label>
  );
}

export function CutoffFilters({
  districts,
  branches,
  year,
  community,
  branch,
  district,
  query,
}: {
  districts: DistrictOption[];
  branches: BranchOption[];
  year: number;
  community: Community;
  branch: string | null;
  district: string | null;
  query: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const [term, setTerm] = React.useState(query ?? "");

  const update = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      params.delete("page");
      const next = params.toString();
      startTransition(() => {
        router.replace(next ? `${pathname}?${next}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const setParam = React.useCallback(
    (key: string, value: string) => {
      update((params) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
    },
    [update],
  );

  React.useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (term === current) return;

    const timer = window.setTimeout(() => {
      update((params) => {
        const trimmed = term.trim();
        if (trimmed) params.set("q", trimmed);
        else params.delete("q");
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [term, searchParams, update]);

  return (
    <Card className="p-3 md:p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Find a college in these results…"
          className="h-10 pl-9 pr-20"
          aria-label="Search colleges in cutoff results"
        />
        {isPending && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
            Updating…
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <FilterSelect
          label="Year"
          name="year"
          value={String(year)}
          onChange={(value) => setParam("year", value)}
        >
          {CUTOFF_YEARS.map((value) => (
            <option key={value} value={value}>
              {value}
              {value === 2025 ? " (ranks)" : ""}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Community"
          name="community"
          value={community}
          onChange={(value) => setParam("community", value)}
        >
          {COMMUNITIES.map((value) => (
            <option key={value} value={value}>
              {value} — {COMMUNITY_LABELS[value]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Branch"
          name="branch"
          value={branch ?? "all"}
          onChange={(value) => setParam("branch", value)}
        >
          <option value="all">All branches</option>
          {branches.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="District"
          name="district"
          value={district ?? ""}
          onChange={(value) => setParam("district", value)}
        >
          <option value="">All districts</option>
          {districts.map((item) => (
            <option key={item.district} value={item.district}>
              {item.district} ({item.colleges})
            </option>
          ))}
        </FilterSelect>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-[11px] text-muted-foreground">
          Ranks are published for 2025 only. Earlier years show marks.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setTerm("");
            router.replace(pathname, { scroll: false });
          }}
          className="gap-1.5"
        >
          <X className="size-3.5" />
          Reset
        </Button>
      </div>
    </Card>
  );
}

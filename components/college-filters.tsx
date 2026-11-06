"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DistrictOption = { district: string; colleges: number };
type BranchOption = { code: string; name: string; colleges: number };

const COLLEGE_TYPES = [
  "Government",
  "Government Aided",
  "Self-Financing",
  "University Department",
];

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

export function CollegeFilters({
  districts,
  branches,
}: {
  districts: DistrictOption[];
  branches: BranchOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const [term, setTerm] = React.useState(searchParams.get("q") ?? "");

  const update = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      params.delete("page");
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
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

  const hasFilters = ["q", "district", "branch", "type", "hostel", "autonomous"].some(
    (key) => searchParams.has(key),
  );

  return (
    <Card className="p-3 md:p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search by college name, code, or district…"
          className="h-10 pl-9 pr-20"
          aria-label="Search colleges"
        />
        {isPending && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
            Updating…
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <FilterSelect
          label="District"
          name="district"
          value={searchParams.get("district") ?? ""}
          onChange={(value) => setParam("district", value)}
        >
          <option value="">All districts</option>
          {districts.map((item) => (
            <option key={item.district} value={item.district}>
              {item.district} ({item.colleges})
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Branch"
          name="branch"
          value={searchParams.get("branch") ?? ""}
          onChange={(value) => setParam("branch", value)}
        >
          <option value="">All branches</option>
          {branches.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name} ({item.colleges})
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="College type"
          name="type"
          value={searchParams.get("type") ?? ""}
          onChange={(value) => setParam("type", value)}
        >
          <option value="">All types</option>
          {COLLEGE_TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Hostel"
          name="hostel"
          value={searchParams.get("hostel") ?? ""}
          onChange={(value) => setParam("hostel", value)}
        >
          <option value="">Any hostel</option>
          <option value="boys">Boys hostel</option>
          <option value="girls">Girls hostel</option>
        </FilterSelect>

        <FilterSelect
          label="Autonomy"
          name="autonomous"
          value={searchParams.get("autonomous") ?? ""}
          onChange={(value) => setParam("autonomous", value)}
        >
          <option value="">Any status</option>
          <option value="true">Autonomous</option>
          <option value="false">Non-autonomous</option>
        </FilterSelect>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-[11px] text-muted-foreground">
          Filters update the URL, so you can bookmark or share a shortlist.
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasFilters}
          onClick={() => {
            setTerm("");
            router.replace(pathname, { scroll: false });
          }}
          className={cn("gap-1.5", !hasFilters && "invisible")}
        >
          <X className="size-3.5" />
          Clear all
        </Button>
      </div>
    </Card>
  );
}

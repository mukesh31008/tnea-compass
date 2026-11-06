"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchCollege = {
  code: string;
  name: string;
  district: string | null;
  type: string;
};

type SelectedCollege = {
  code: string;
  name: string;
  district: string | null;
};

const MAX_COLLEGES = 4;

export function ComparePicker({ selected }: { selected: SelectedCollege[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const [term, setTerm] = React.useState("");
  const [results, setResults] = React.useState<SearchCollege[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const atLimit = selected.length >= MAX_COLLEGES;

  React.useEffect(() => {
    const query = term.trim();
    if (query.length < 2 || atLimit) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/colleges/search?q=${encodeURIComponent(query)}&limit=8`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Search failed");
        const data = (await response.json()) as { colleges: SearchCollege[] };
        setResults(data.colleges ?? []);
        setOpen(true);
        setActiveIndex(data.colleges.length > 0 ? 0 : -1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term, atLimit]);

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const navigate = React.useCallback(
    (codes: string[]) => {
      const next = new URLSearchParams(searchParams.toString());
      if (codes.length > 0) next.set("colleges", codes.join(","));
      else next.delete("colleges");
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const addCollege = React.useCallback(
    (code: string) => {
      if (selected.some((item) => item.code === code)) {
        setTerm("");
        setOpen(false);
        return;
      }
      if (selected.length >= MAX_COLLEGES) return;
      navigate([...selected.map((item) => item.code), code]);
      setTerm("");
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
    },
    [navigate, selected],
  );

  const removeCollege = React.useCallback(
    (code: string) => {
      navigate(selected.filter((item) => item.code !== code).map((item) => item.code));
    },
    [navigate, selected],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (event.key === "ArrowDown" && term.trim().length >= 2) setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const choice = results[activeIndex] ?? results[0];
      if (choice) addCollege(choice.code);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Card className="p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Choose up to four colleges</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Search by name or TNEA code. The URL updates so you can share the comparison.
          </p>
        </div>
        <Badge variant="mono">
          {selected.length} / {MAX_COLLEGES} selected
        </Badge>
      </div>

      {selected.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selected.map((college) => (
            <span
              key={college.code}
              className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-surface/70 py-1 pl-2 pr-1"
            >
              <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                {college.code}
              </span>
              <span className="max-w-[15rem] truncate text-[12px] font-medium">
                {college.name}
              </span>
              <button
                type="button"
                onClick={() => removeCollege(college.code)}
                aria-label={`Remove ${college.name}`}
                className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div ref={containerRef} className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          disabled={atLimit}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (term.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={
            atLimit
              ? "Remove a college to add another"
              : "Search a college name or code, for example 0001…"
          }
          aria-label="Search colleges to compare"
          aria-expanded={open}
          aria-controls="compare-search-results"
          aria-autocomplete="list"
          className="h-10 pl-9 pr-10"
        />
        {(loading || isPending) && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </span>
        )}

        {open && term.trim().length >= 2 && !atLimit && (
          <div
            id="compare-search-results"
            role="listbox"
            aria-label="College search results"
            className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-30 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
          >
            {results.length === 0 ? (
              <p className="px-4 py-3 text-[12px] text-muted-foreground">
                {loading ? "Searching…" : "No college matches that search."}
              </p>
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {results.map((college, index) => {
                  const alreadySelected = selected.some(
                    (item) => item.code === college.code,
                  );
                  return (
                    <li key={college.code}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        disabled={alreadySelected}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => addCollege(college.code)}
                        className={cn(
                          "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors",
                          index === activeIndex && "bg-accent/60",
                          alreadySelected && "opacity-50",
                        )}
                      >
                        <Badge variant="mono" className="mt-0.5 shrink-0">
                          {college.code}
                        </Badge>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {college.name}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {college.district ?? "District not reported"} ·{" "}
                            {college.type}
                          </span>
                        </span>
                        {alreadySelected ? (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Added
                          </span>
                        ) : (
                          <ArrowRight className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <p className="text-[11px] text-muted-foreground">
          Comparisons use published records. Blank values mean the source did
          not report them.
        </p>
        {selected.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate([])}
            className="gap-1.5"
          >
            <X className="size-3.5" />
            Clear all
          </Button>
        )}
      </div>
    </Card>
  );
}

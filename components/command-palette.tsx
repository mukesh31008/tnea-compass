"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Compass,
  GitCompareArrows,
  ListChecks,
  BookOpenCheck,
  Quote,
  Search,
  Sparkles,
  Calculator,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SearchCollege = {
  code: string;
  name: string;
  district: string | null;
  type: string | null;
};

const QUICK_LINKS = [
  { label: "Ask the record", href: "/assistant", icon: Quote, hint: "Cited answers" },
  { label: "College explorer", href: "/colleges", icon: Building2, hint: "478 institutions" },
  { label: "Cutoff trends", href: "/cutoffs", icon: BarChart3, hint: "2020 – 2026" },
  { label: "Where you stand", href: "/predictor", icon: Sparkles, hint: "By rank or mark" },
  { label: "Cutoff check", href: "/predictor?mode=cutoff", icon: Calculator, hint: "Compare marks" },
  { label: "Compare colleges", href: "/compare", icon: GitCompareArrows, hint: "Up to 4" },
  { label: "Choice list", href: "/choices", icon: ListChecks, hint: "Build and export" },
  { label: "Admission pathways", href: "/pathways", icon: BookOpenCheck, hint: "Rules guide" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchCollege[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("tnea:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("tnea:open-search", onOpen);
    };
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/colleges/search?q=${encodeURIComponent(term)}&limit=6`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search failed");
        const data = (await response.json()) as { colleges: SearchCollege[] };
        setResults(data.colleges ?? []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const links = QUICK_LINKS.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search TNEA Compass</DialogTitle>
        <Command shouldFilter={false} className="flex max-h-[70vh] flex-col">
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search colleges, tools, or a district…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
              ESC
            </kbd>
          </div>

          <Command.List className="flex-1 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
              {loading ? "Searching…" : "No matches. Try a college code or district."}
            </Command.Empty>

            {results.length > 0 && (
              <Command.Group
                heading="Colleges"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {results.map((college) => (
                  <Command.Item
                    key={college.code}
                    value={`${college.code}-${college.name}`}
                    onSelect={() => go(`/colleges/${college.code}`)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm",
                      "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                    )}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted font-mono text-[10px] font-semibold text-muted-foreground">
                      {college.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{college.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {college.district ?? "Tamil Nadu"}
                      </span>
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {links.length > 0 && (
              <Command.Group
                heading="Go to"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {links.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() => go(item.href)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm",
                      "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                    )}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                      <item.icon className="size-4" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.hint}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Compass className="size-3" /> TNEA Compass
            </span>
            <span className="inline-flex items-center gap-2">
              <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono">↑↓</kbd>
              navigate
              <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono">↵</kbd>
              open
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export function openCommandPalette() {
  window.dispatchEvent(new Event("tnea:open-search"));
}

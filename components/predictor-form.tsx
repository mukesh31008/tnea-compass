"use client";

import * as React from "react";
import { ArrowRight, Gauge, Hash, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { COMMUNITIES, COMMUNITY_LABELS } from "@/lib/tnea";
import { cn } from "@/lib/utils";

type DistrictOption = { district: string; colleges: number };
type BranchOption = { code: string; name: string; colleges: number };

export function PredictorForm({
  mode,
  community,
  branch,
  district,
  rank,
  cutoff,
  districts,
  branches,
}: {
  mode: "rank" | "cutoff";
  community: string;
  branch: string | null;
  district: string | null;
  rank: string;
  cutoff: string;
  districts: DistrictOption[];
  branches: BranchOption[];
}) {
  const [activeMode, setActiveMode] = React.useState(mode);
  const [rankValue, setRankValue] = React.useState(rank);
  const [cutoffValue, setCutoffValue] = React.useState(cutoff);

  return (
    <Card className="p-4 md:p-5">
      <form action="/predictor" method="get">
        <input type="hidden" name="mode" value={activeMode} />

        <div
          className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
          role="tablist"
          aria-label="Prediction mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === "rank"}
            onClick={() => setActiveMode("rank")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
              activeMode === "rank"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Hash className="size-3.5" />
            By general rank
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === "cutoff"}
            onClick={() => setActiveMode("cutoff")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
              activeMode === "cutoff"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Gauge className="size-3.5" />
            By cutoff mark
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {activeMode === "rank" ? (
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                Your TNEA general rank
              </span>
              <Input
                name="rank"
                type="number"
                inputMode="numeric"
                min={1}
                max={300000}
                step={1}
                required
                value={rankValue}
                onChange={(event) => setRankValue(event.target.value)}
                placeholder="e.g. 12500"
                className="h-9 font-mono"
              />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                Your cutoff mark (out of 200)
              </span>
              <Input
                name="cutoff"
                type="number"
                inputMode="decimal"
                min={0}
                max={200}
                step={0.5}
                required
                value={cutoffValue}
                onChange={(event) => setCutoffValue(event.target.value)}
                placeholder="e.g. 190.5"
                className="h-9 font-mono"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
              Community
            </span>
            <select
              name="community"
              defaultValue={community}
              className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-[13px] shadow-xs outline-none focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              {COMMUNITIES.map((value) => (
                <option key={value} value={value}>
                  {value} — {COMMUNITY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
              Branch
            </span>
            <select
              name="branch"
              defaultValue={branch ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-[13px] shadow-xs outline-none focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              <option value="">All branches</option>
              {branches.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
              District
            </span>
            <select
              name="district"
              defaultValue={district ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-[13px] shadow-xs outline-none focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              <option value="">All districts</option>
              {districts.map((item) => (
                <option key={item.district} value={item.district}>
                  {item.district} ({item.colleges})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
            Compared with published 2025 closing values only. A rank and a
            cutoff mark are not converted into each other.
          </p>
          <Button type="submit" className="gap-2 sm:w-auto">
            <Search className="size-4" />
            Check my chances
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </form>
    </Card>
  );
}

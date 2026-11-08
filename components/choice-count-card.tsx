"use client";

import Link from "next/link";
import { ArrowUpRight, ListChecks } from "lucide-react";

import { useChoices } from "@/components/choices-provider";

export function ChoiceCountCard() {
  const { count, ready } = useChoices();

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">Local choices</p>
        <ListChecks className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold">
        {ready ? count : "—"}
      </p>
      <Link
        href="/choices"
        className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
      >
        Open choice list
        <ArrowUpRight className="size-3" />
      </Link>
    </div>
  );
}

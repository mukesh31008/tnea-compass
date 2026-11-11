"use client";

import * as React from "react";
import Link from "next/link";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Download,
  GripVertical,
  ListChecks,
  MapPin,
  Printer,
  Search,
  Trash2,
  Share2,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChoiceSync } from "@/components/choice-sync";
import { useChoices } from "@/components/choices-provider";
import { csvField, type ChoiceRecord } from "@/lib/choices";
import { cn, formatNumber } from "@/lib/utils";

function addedLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved in this browser";
  return `Added ${new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)}`;
}

function downloadCsv(choices: ChoiceRecord[]) {
  const header = [
    "priority",
    "college_code",
    "college_name",
    "branch_code",
    "branch_name",
    "district",
    "college_type",
    "community",
    "data_year",
    "closing_mark",
    "closing_rank",
    "added_at",
  ];
  const rows = choices.map((choice, index) =>
    [
      index + 1,
      choice.collegeCode,
      choice.collegeName,
      choice.branchCode,
      choice.branchName,
      choice.district,
      choice.type,
      choice.community,
      choice.dataYear,
      choice.cutoffMark,
      choice.rank,
      choice.addedAt,
    ]
      .map(csvField)
      .join(","),
  );

  const csv = `\uFEFF${header.join(",")}\n${rows.join("\n")}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tnea-choice-list-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function shareOnWhatsApp(choices: ChoiceRecord[]) {
  const topFive = choices
    .slice(0, 5)
    .map((c, i) => `${i + 1}. [${c.collegeCode}] ${c.branchCode} - ${c.collegeName}`)
    .join("\n");
  const more = choices.length > 5 ? `\n...and ${choices.length - 5} more choices.` : "";
  const text = encodeURIComponent(
    `📋 My TNEA Counselling Choice List (${choices.length} choices):\n\n${topFive}${more}\n\nDrafted with TNEA Compass (https://tneacompass.in)`,
  );
  window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
}

function SortableChoice({
  choice,
  index,
  total,
  onMove,
  onRemove,
}: {
  choice: ChoiceRecord;
  index: number;
  total: number;
  onMove: (index: number, target: number) => void;
  onRemove: (choice: ChoiceRecord) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: choice.id });

  const contextLabel =
    choice.community && choice.dataYear
      ? `${choice.community} ${choice.dataYear}`
      : "Context not recorded";

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "rounded-xl border border-border bg-card shadow-xs print:break-inside-avoid",
        isDragging && "z-10 opacity-90 shadow-lg",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${choice.branchName} at ${choice.collegeName}`}
          className="mt-0.5 grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden"
        >
          <GripVertical className="size-4" />
        </button>

        <span className="mt-1 w-6 shrink-0 font-mono text-[11px] font-semibold text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="mono">{choice.collegeCode}</Badge>
            <Link
              href={`/colleges/${choice.collegeCode}`}
              className="text-[14px] font-semibold leading-snug hover:text-primary hover:underline"
            >
              {choice.collegeShortName ?? choice.collegeName}
            </Link>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3" />
            {choice.district ?? "District not reported"} · {choice.type}
          </p>
          <p className="mt-2 flex flex-wrap items-baseline gap-2">
            <Badge variant="mono">{choice.branchCode}</Badge>
            <span className="text-[12px] leading-snug">{choice.branchName}</span>
          </p>
        </div>

        <div className="shrink-0 text-right">
          {choice.cutoffMark === null ? (
            <p className="text-[11px] font-medium text-muted-foreground">
              Not reported
            </p>
          ) : (
            <p className="font-mono text-[15px] font-semibold">
              {choice.cutoffMark.toFixed(1)}
            </p>
          )}
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {contextLabel}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {choice.rank === null ? "rank n/r" : `#${formatNumber(choice.rank)}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 print:hidden">
        <span className="text-[10px] text-muted-foreground">
          {addedLabel(choice.addedAt)}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            aria-label={`Move ${choice.branchName} up`}
            title="Move up"
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
            aria-label={`Move ${choice.branchName} down`}
            title="Move down"
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(choice)}
            aria-label={`Remove ${choice.branchName} from my list`}
            title="Remove"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </li>
  );
}

function EmptyChoices() {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <ListChecks className="size-6" />
        </span>
        <h2 className="display mt-5 text-2xl leading-tight">
          Build a list you can explain
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Add a branch from any college profile or comparison result. The list
          is saved in this browser only, and you can reorder it, print it, or
          export a CSV.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="gap-1.5">
            <Link href="/colleges">
              <Search className="size-4" />
              Explore colleges
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1.5">
            <Link href="/predictor">
              Compare a rank
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-px border-t border-border bg-border sm:grid-cols-3">
        {[
          {
            title: "1. Find a programme",
            body: "Open a college profile and add the branch you want, not just the college.",
          },
          {
            title: "2. Order the list",
            body: "Drag or use the arrow buttons. The order stays in this browser.",
          },
          {
            title: "3. Export or print",
            body: "Download a CSV for a spreadsheet, or print a clean PDF-style copy.",
          },
        ].map((step) => (
          <div key={step.title} className="bg-card px-4 py-4">
            <p className="text-[12px] font-semibold">{step.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ChoiceList() {
  const { choices, ready, remove, setOrder, clear } = useChoices();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = choices.map((choice) => choice.id);
  const withCutoff = choices.filter(
    (choice) => choice.cutoffMark !== null,
  ).length;
  const missingContext = choices.filter(
    (choice) => choice.community === null || choice.dataYear === null,
  ).length;

  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= choices.length || from === to) return;
    setOrder(arrayMove(ids, from, to));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = choices.findIndex((choice) => choice.id === active.id);
    const to = choices.findIndex((choice) => choice.id === over.id);
    if (from < 0 || to < 0) return;
    setOrder(arrayMove(ids, from, to));
  };

  const onRemove = (choice: ChoiceRecord) => {
    remove(choice.id);
    toast.success("Removed from My list", {
      description: `${choice.collegeShortName ?? choice.collegeName} · ${choice.branchCode}`,
    });
  };

  if (!ready) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    );
  }

  if (choices.length === 0) {
    return <EmptyChoices />;
  }

  return (
    <>
      <div className="hidden print:mb-6 print:block">
        <h1 className="text-2xl font-semibold">My TNEA choice list</h1>
        <p className="mt-1 text-[12px]">
          {choices.length} choices, saved order · printed{" "}
          {new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </p>
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="font-mono text-2xl font-semibold tracking-tight">
                {choices.length}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {choices.length === 1 ? "choice" : "choices"} in order
              </p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold tracking-tight">
                {withCutoff}
              </p>
              <p className="text-[11px] text-muted-foreground">
                with a recorded close
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            <ChoiceSync />
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/simulator">
                <PlayCircle className="size-3.5 text-primary" />
                Simulate
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
              onClick={() => shareOnWhatsApp(choices)}
            >
              <Share2 className="size-3.5" />
              WhatsApp
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                downloadCsv(choices);
                toast.success("CSV downloaded");
              }}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="size-3.5" />
              Print / PDF
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (
                  window.confirm(
                    `Clear all ${choices.length} choices from this browser?`,
                  )
                ) {
                  clear();
                  toast.success("Choice list cleared");
                }
              }}
            >
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          </div>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          Saved in this browser only. Signing in is not required, and clearing
          your browser data will remove the list. Reorder by dragging a row or
          using the arrow buttons.
        </p>
        {missingContext > 0 && (
          <p className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-foreground">
            {missingContext === 1
              ? "1 saved choice has no community or data year."
              : `${missingContext} saved choices have no community or data year.`}{" "}
            Re-add them from a result or college page so the closing value keeps
            its context.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs print:hidden">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary shrink-0" />
            <span className="text-foreground">
              {choices.length < 10
                ? "Tip: TNEA allows unlimited choices. Students who list 15+ choices with safe backups rarely go un-allotted."
                : "Strong list depth. Test your priority order against multi-round cutoffs to avoid losing dream seats."}
            </span>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary hover:text-primary">
            <Link href="/simulator">
              Run Round Simulation <ArrowRight className="ml-1 size-3" />
            </Link>
          </Button>
        </div>
      </Card>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="mt-3 space-y-2.5">
            {choices.map((choice, index) => (
              <SortableChoice
                key={choice.id}
                choice={choice}
                index={index}
                total={choices.length}
                onMove={moveTo}
                onRemove={onRemove}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </>
  );
}

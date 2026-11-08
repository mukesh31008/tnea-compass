"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteExamRecord,
  saveExamRecord,
} from "@/app/tracker/actions";
import { EXAM_CATEGORIES, EXAM_STATUSES } from "@/lib/tracker";
import { formatNumber } from "@/lib/utils";

export type ExamRow = {
  id: string;
  name: string;
  category: string;
  examDate: string | null;
  status: string;
  score: number | null;
  rank: number | null;
  notes: string | null;
};

type FormState = {
  name: string;
  category: string;
  examDate: string;
  status: string;
  score: string;
  rank: string;
  notes: string;
};

const EMPTY: FormState = {
  name: "",
  category: "TNEA counselling",
  examDate: "",
  status: "Planned",
  score: "",
  rank: "",
  notes: "",
};

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20";

function statusTone(
  status: string,
): "default" | "success" | "warning" | "outline" {
  if (status === "Result received") return "success";
  if (status === "Result awaited") return "warning";
  if (status === "Planned") return "outline";
  return "default";
}

function formatDate(value: string | null) {
  if (!value) return "No date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ExamTracker({ exams }: { exams: ExamRow[] }) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setError(null);
  }

  function startEdit(exam: ExamRow) {
    setEditingId(exam.id);
    setForm({
      name: exam.name,
      category: exam.category,
      examDate: exam.examDate ?? "",
      status: exam.status,
      score: exam.score === null ? "" : String(exam.score),
      rank: exam.rank === null ? "" : String(exam.rank),
      notes: exam.notes ?? "",
    });
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const result = await saveExamRecord({
      id: editingId ?? undefined,
      ...form,
    });

    if (!result.ok) {
      setError(result.error);
    } else {
      setMessage(editingId ? "Exam updated." : "Exam saved.");
      resetForm();
      router.refresh();
    }
    setPending(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteExamRecord(id);
    if (!result.ok) setError(result.error);
    else {
      if (editingId === id) resetForm();
      router.refresh();
    }
    setDeletingId(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {editingId ? "Edit an exam" : "Add an exam or counselling milestone"}
            </h2>
            {editingId && (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[12px] font-medium">Name</span>
                <Input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder="e.g. TNEA 2026 counselling"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Category
                </span>
                <select
                  className={selectClass}
                  value={form.category}
                  onChange={(event) => set("category", event.target.value)}
                >
                  {EXAM_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Status
                </span>
                <select
                  className={selectClass}
                  value={form.status}
                  onChange={(event) => set("status", event.target.value)}
                >
                  {EXAM_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Date
                </span>
                <Input
                  type="date"
                  value={form.examDate}
                  onChange={(event) => set("examDate", event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Score
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={form.score}
                  onChange={(event) => set("score", event.target.value)}
                  placeholder="Optional, as published"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Rank
                </span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.rank}
                  onChange={(event) => set("rank", event.target.value)}
                  placeholder="Optional, as published"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Note
                </span>
                <Textarea
                  value={form.notes}
                  onChange={(event) => set("notes", event.target.value)}
                  maxLength={400}
                  placeholder="Optional, e.g. certificate verification date"
                  className="min-h-16"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : editingId ? (
                  <Check className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {pending ? "Saving…" : editingId ? "Update exam" : "Save exam"}
              </Button>
              {message && (
                <span className="text-[12px] font-medium text-success">
                  {message}
                </span>
              )}
              {error && (
                <span role="alert" className="text-[12px] text-destructive">
                  {error}
                </span>
              )}
            </div>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">Saved exams</h2>
            <Badge variant="mono">{exams.length} records</Badge>
          </div>

          {exams.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <CalendarClock className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No exams yet</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Add TNEA counselling, a board exam or an entrance exam you plan
                to take.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {exams.map((exam) => (
                <li key={exam.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold">{exam.name}</p>
                        <Badge variant={statusTone(exam.status)}>
                          {exam.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {exam.category} · {formatDate(exam.examDate)}
                        {exam.score !== null && (
                          <> · score {formatNumber(exam.score)}</>
                        )}
                        {exam.rank !== null && (
                          <> · rank {formatNumber(exam.rank)}</>
                        )}
                      </p>
                      {exam.notes && (
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {exam.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${exam.name}`}
                        onClick={() => startEdit(exam)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${exam.name}`}
                        disabled={deletingId === exam.id}
                        onClick={() => handleDelete(exam.id)}
                      >
                        {deletingId === exam.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="border-primary/20 bg-accent/25 p-5">
          <h2 className="text-sm font-semibold">Keep the source</h2>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Score and rank fields are for values you have actually received.
            Leave them blank until the result is published. Nothing here is
            compared with the official cutoff tables automatically.
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold">A useful order</h2>
          <ol className="mt-2 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
            <li>1. Mark the application or exam as Planned.</li>
            <li>2. Change it to Registered when the fee or form is done.</li>
            <li>3. Use Result awaited and Result received only when true.</li>
            <li>4. Add the rank only from the official result page.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Calculator, Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAcademicRecord,
  saveAcademicRecord,
} from "@/app/tracker/actions";
import {
  ACADEMIC_SUBJECTS,
  CLASS_LEVELS,
  computeEngineeringCutoff,
} from "@/lib/tracker";
import { cn, formatNumber } from "@/lib/utils";

export type AcademicRow = {
  id: string;
  classLevel: number;
  subject: string;
  mark: number;
  maxMark: number;
  examBoard: string | null;
  notes: string | null;
};

type FormState = {
  classLevel: number;
  subject: string;
  mark: string;
  maxMark: string;
  examBoard: string;
  notes: string;
};

const EMPTY: FormState = {
  classLevel: 12,
  subject: "Mathematics",
  mark: "",
  maxMark: "100",
  examBoard: "",
  notes: "",
};

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20";

function percent(mark: number, maxMark: number) {
  if (!maxMark) return "—";
  return `${((mark / maxMark) * 100).toFixed(1)}%`;
}

export function AcademicTracker({ records }: { records: AcademicRow[] }) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLDivElement>(null);

  const class12 = records.filter((record) => record.classLevel === 12);
  const cutoff = computeEngineeringCutoff(class12);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setError(null);
  }

  function startEdit(record: AcademicRow) {
    setEditingId(record.id);
    setForm({
      classLevel: record.classLevel,
      subject: record.subject,
      mark: String(record.mark),
      maxMark: String(record.maxMark),
      examBoard: record.examBoard ?? "",
      notes: record.notes ?? "",
    });
    setMessage(null);
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

    const result = await saveAcademicRecord({
      classLevel: form.classLevel,
      subject: form.subject,
      mark: form.mark,
      maxMark: form.maxMark,
      examBoard: form.examBoard,
      notes: form.notes,
    });

    if (!result.ok) {
      setError(result.error);
    } else {
      setMessage(editingId ? "Mark updated." : "Mark saved.");
      resetForm();
      router.refresh();
    }
    setPending(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteAcademicRecord(id);
    if (!result.ok) setError(result.error);
    else {
      if (editingId === id) resetForm();
      router.refresh();
    }
    setDeletingId(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-5">
        <div ref={formRef} className="scroll-mt-24">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {editingId ? "Edit a subject mark" : "Add a subject mark"}
            </h2>
            {editingId && (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Saving the same class and subject updates the existing row. Marks
            are stored exactly as you enter them.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">Class</span>
                <select
                  className={selectClass}
                  value={form.classLevel}
                  onChange={(event) =>
                    set("classLevel", Number(event.target.value))
                  }
                >
                  {CLASS_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Subject
                </span>
                <select
                  className={selectClass}
                  value={form.subject}
                  onChange={(event) => set("subject", event.target.value)}
                >
                  {ACADEMIC_SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Mark obtained
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.5"
                  required
                  value={form.mark}
                  onChange={(event) => set("mark", event.target.value)}
                  placeholder="e.g. 92"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Maximum mark
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  step="0.5"
                  required
                  value={form.maxMark}
                  onChange={(event) => set("maxMark", event.target.value)}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Board or school
                </span>
                <Input
                  value={form.examBoard}
                  onChange={(event) => set("examBoard", event.target.value)}
                  maxLength={80}
                  placeholder="Optional, e.g. Tamil Nadu State Board"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Note
                </span>
                <Textarea
                  value={form.notes}
                  onChange={(event) => set("notes", event.target.value)}
                  maxLength={300}
                  placeholder="Optional, e.g. improvement exam planned"
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
                {pending ? "Saving…" : editingId ? "Update mark" : "Save mark"}
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
        </div>

        {CLASS_LEVELS.map((level) => {
          const rows = records.filter(
            (record) => record.classLevel === level.value,
          );
          if (rows.length === 0) return null;
          return (
            <Card key={level.value} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold">{level.label} marks</h2>
                <Badge variant="mono">{rows.length} subjects</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-[12px]">
                  <thead className="border-b border-border bg-surface/60 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2 font-medium">Subject</th>
                      <th className="px-3 py-2 text-right font-medium">Mark</th>
                      <th className="px-3 py-2 text-right font-medium">Percent</th>
                      <th className="px-3 py-2 font-medium">Board</th>
                      <th className="px-5 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((record) => (
                      <tr key={record.id} className="hover:bg-muted/25">
                        <td className="px-5 py-2.5 font-medium">
                          {record.subject}
                          {record.notes && (
                            <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                              {record.notes}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          {formatNumber(record.mark)} /{" "}
                          {formatNumber(record.maxMark)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                          {percent(record.mark, record.maxMark)}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {record.examBoard ?? "—"}
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Edit ${record.subject}`}
                              onClick={() => startEdit(record)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete ${record.subject}`}
                              disabled={deletingId === record.id}
                              onClick={() => handleDelete(record.id)}
                            >
                              {deletingId === record.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5 text-destructive" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}

        {records.length === 0 && (
          <Card className="border-dashed p-8 text-center">
            <p className="text-sm font-medium">No marks yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
              Add Class 12 Mathematics, Physics and Chemistry to see your own
              engineering cutoff. Nothing is filled in for you.
            </p>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Calculator className="size-4 text-primary" />
            Your engineering cutoff
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Maths + Physics ÷ 2 + Chemistry ÷ 2, out of 200. Calculated from
            your Class 12 entries only.
          </p>

          <div className="mt-4">
            {cutoff.cutoff === null ? (
              <div>
                <p className="font-mono text-2xl font-semibold text-muted-foreground">
                  Not enough marks
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Missing: {cutoff.missing.join(", ")}
                </p>
              </div>
            ) : (
              <div>
                <p className="font-mono text-3xl font-semibold">
                  {cutoff.cutoff.toFixed(3)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / 200
                  </span>
                </p>
                <ul className="mt-3 space-y-1.5 text-[11px]">
                  {cutoff.working.map((row) => (
                    <li
                      key={row.subject}
                      className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5 last:border-0"
                    >
                      <span className="text-muted-foreground">
                        {row.subject}
                        {row.subject !== "Mathematics" ? " ÷ 2" : ""}
                      </span>
                      <span className="font-mono">
                        {row.normalised.toFixed(3)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p
            className={cn(
              "mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground",
            )}
          >
            This is arithmetic on your own marks, not an official TNEA rank.
            Some programmes and categories use different rules; verify the
            official formula before relying on it.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">What to add</h2>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Class 10 and 11 marks help you see a trend. Class 12 Maths, Physics
            and Chemistry produce the cutoff above. You can add other subjects
            for your own record.
          </p>
        </Card>
      </div>
    </div>
  );
}

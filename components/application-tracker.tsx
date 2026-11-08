"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ClipboardList,
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
  deleteApplication,
  saveApplication,
  setApplicationStage,
} from "@/app/tracker/actions";
import { APPLICATION_STAGES, stageTone } from "@/lib/tracker";
import { formatNumber } from "@/lib/utils";

export type ApplicationRow = {
  id: string;
  collegeCode: string;
  collegeName: string;
  branchCode: string;
  branchName: string | null;
  stage: string;
  priority: number;
  counsellingYear: number;
  round: number | null;
  notes: string | null;
};

type FormState = {
  collegeCode: string;
  collegeName: string;
  branchCode: string;
  branchName: string;
  stage: string;
  priority: string;
  counsellingYear: string;
  round: string;
  notes: string;
};

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/20";

export function ApplicationTracker({
  applications,
  prefill,
}: {
  applications: ApplicationRow[];
  prefill?: Partial<FormState>;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>({
    collegeCode: prefill?.collegeCode ?? "",
    collegeName: prefill?.collegeName ?? "",
    branchCode: prefill?.branchCode ?? "",
    branchName: prefill?.branchName ?? "",
    stage: "Researching",
    priority: "1",
    counsellingYear: "2026",
    round: "",
    notes: "",
  });
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setError(null);
  }

  function startEdit(application: ApplicationRow) {
    setEditingId(application.id);
    setForm({
      collegeCode: application.collegeCode,
      collegeName: application.collegeName,
      branchCode: application.branchCode,
      branchName: application.branchName ?? "",
      stage: application.stage,
      priority: String(application.priority),
      counsellingYear: String(application.counsellingYear),
      round: application.round === null ? "" : String(application.round),
      notes: application.notes ?? "",
    });
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      collegeCode: "",
      collegeName: "",
      branchCode: "",
      branchName: "",
      stage: "Researching",
      priority: "1",
      counsellingYear: "2026",
      round: "",
      notes: "",
    });
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const result = await saveApplication({
      id: editingId ?? undefined,
      ...form,
    });

    if (!result.ok) {
      setError(result.error);
    } else {
      setMessage(editingId ? "Application updated." : "Application saved.");
      resetForm();
      router.refresh();
    }
    setPending(false);
  }

  async function handleStage(id: string, stage: string) {
    setBusyId(id);
    const result = await setApplicationStage(id, stage);
    if (!result.ok) setError(result.error);
    else router.refresh();
    setBusyId(null);
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const result = await deleteApplication(id);
    if (!result.ok) setError(result.error);
    else {
      if (editingId === id) resetForm();
      router.refresh();
    }
    setBusyId(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-5">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {editingId ? "Edit an application" : "Track a college application"}
            </h2>
            {editingId && (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            One row per college and branch. This is your own decision log; it is
            not connected to the official TNEA application.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-[0.5fr_1.5fr]">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  College code
                </span>
                <Input
                  required
                  maxLength={12}
                  value={form.collegeCode}
                  onChange={(event) => set("collegeCode", event.target.value)}
                  placeholder="0001"
                  className="font-mono"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  College name
                </span>
                <Input
                  required
                  maxLength={200}
                  value={form.collegeName}
                  onChange={(event) => set("collegeName", event.target.value)}
                  placeholder="College of Engineering, Guindy"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Branch code
                </span>
                <Input
                  maxLength={12}
                  value={form.branchCode}
                  onChange={(event) => set("branchCode", event.target.value)}
                  placeholder="Optional"
                  className="font-mono"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Branch name
                </span>
                <Input
                  maxLength={160}
                  value={form.branchName}
                  onChange={(event) => set("branchName", event.target.value)}
                  placeholder="Optional"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Stage
                </span>
                <select
                  className={selectClass}
                  value={form.stage}
                  onChange={(event) => set("stage", event.target.value)}
                >
                  {APPLICATION_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Year
                </span>
                <select
                  className={selectClass}
                  value={form.counsellingYear}
                  onChange={(event) =>
                    set("counsellingYear", event.target.value)
                  }
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2027">2027</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Your priority
                </span>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={form.priority}
                  onChange={(event) => set("priority", event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Counselling round
                </span>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.round}
                  onChange={(event) => set("round", event.target.value)}
                  placeholder="Optional"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[12px] font-medium">
                  Note
                </span>
                <Textarea
                  value={form.notes}
                  onChange={(event) => set("notes", event.target.value)}
                  maxLength={500}
                  placeholder="Optional, e.g. documents pending"
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
                {pending
                  ? "Saving…"
                  : editingId
                    ? "Update application"
                    : "Save application"}
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
            <h2 className="text-sm font-semibold">Your applications</h2>
            <Badge variant="mono">{applications.length} tracked</Badge>
          </div>

          {applications.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <ClipboardList className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Nothing tracked yet</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Add a college from its profile, or enter one above.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {applications.map((application) => (
                <li key={application.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="mono">{application.collegeCode}</Badge>
                        <p className="text-[13px] font-semibold">
                          {application.collegeName}
                        </p>
                        <Badge variant={stageTone(application.stage)}>
                          {application.stage}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {application.branchName ?? "Branch not recorded"}
                        {application.branchCode
                          ? ` (${application.branchCode})`
                          : ""}{" "}
                        · priority {formatNumber(application.priority)} ·{" "}
                        {application.counsellingYear}
                        {application.round
                          ? ` · round ${application.round}`
                          : ""}
                      </p>
                      {application.notes && (
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {application.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <select
                        aria-label={`Stage for ${application.collegeName}`}
                        className="h-8 rounded-lg border border-input bg-card px-2 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                        value={application.stage}
                        disabled={busyId === application.id}
                        onChange={(event) =>
                          handleStage(application.id, event.target.value)
                        }
                      >
                        {APPLICATION_STAGES.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${application.collegeName}`}
                        onClick={() => startEdit(application)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${application.collegeName}`}
                        disabled={busyId === application.id}
                        onClick={() => handleDelete(application.id)}
                      >
                        {busyId === application.id ? (
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
          <h2 className="text-sm font-semibold">A decision log, not a promise</h2>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            The stage is what you know right now. It does not predict an
            allotment and it is not shared with a college. Update it after each
            official round so your own record stays accurate.
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Stages</h2>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <li><span className="font-medium text-foreground">Researching</span> — reading the record.</li>
            <li><span className="font-medium text-foreground">Shortlisted</span> — on your choice list.</li>
            <li><span className="font-medium text-foreground">Applied</span> — form or option submitted.</li>
            <li><span className="font-medium text-foreground">Allotted</span> — official allotment received.</li>
            <li><span className="font-medium text-foreground">Accepted</span> — you have accepted it.</li>
            <li><span className="font-medium text-foreground">Declined</span> — you have moved on.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

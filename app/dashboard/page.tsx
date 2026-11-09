import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Calculator,
  GraduationCap,
  ListTodo,
  NotebookPen,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { ChoiceCountCard } from "@/components/choice-count-card";
import { TrackerShell } from "@/components/tracker-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTrackerData, profileCompleteness } from "@/lib/db/tracker";
import { requireUser } from "@/lib/session";
import { computeEngineeringCutoff, stageTone } from "@/lib/tracker";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireUser("/dashboard");
  const data = await getTrackerData(session.user.id);
  const completeness = profileCompleteness(data.profile);

  const class12 = data.academic.filter((record) => record.classLevel === 12);
  const cutoff = computeEngineeringCutoff(class12);
  const activeApplications = data.applications.filter(
    (application) =>
      application.stage !== "Declined" && application.stage !== "Accepted",
  );
  const pendingExams = data.exams.filter(
    (exam) => exam.status === "Planned" || exam.status === "Registered",
  );

  const nextSteps: { title: string; body: string; href: string; cta: string }[] =
    [];
  if (completeness.percent === 0) {
    nextSteps.push({
      title: "Set the profile basics",
      body: "Add a district, school type and community only if you want them on your own plan.",
      href: "/profile",
      cta: "Open profile",
    });
  }
  if (cutoff.cutoff === null) {
    nextSteps.push({
      title: "Add Class 12 Maths, Physics and Chemistry",
      body: `Still missing: ${cutoff.missing.join(", ") || "all three subjects"}.`,
      href: "/tracker/academic",
      cta: "Add marks",
    });
  }
  if (data.exams.length === 0) {
    nextSteps.push({
      title: "Plan the counselling step",
      body: "Record TNEA counselling or the next exam you are waiting for.",
      href: "/tracker/exams",
      cta: "Add an exam",
    });
  }
  if (data.applications.length === 0) {
    nextSteps.push({
      title: "Track one application",
      body: "Start with a college you would genuinely accept, not a list of twenty.",
      href: "/colleges",
      cta: "Find a college",
    });
  }

  const greeting = data.profile?.displayName?.trim()
    ? `Hello, ${data.profile.displayName.trim().split(/\s+/)[0]}`
    : "Your private record";

  return (
    <TrackerShell
      eyebrow="Private tracker"
      title={greeting}
      description="A calm view of what you have saved: marks, exams, applications and the local choice list. Nothing here is public."
      actions={
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/profile">
            <UserRound className="size-3.5" />
            Profile
          </Link>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">Class 12 cutoff</p>
            <Calculator className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {cutoff.cutoff === null ? "—" : cutoff.cutoff.toFixed(1)}
            {cutoff.cutoff !== null && (
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                / 200
              </span>
            )}
          </p>
          <Link
            href="/tracker/results"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            {cutoff.cutoff === null ? "Add marks" : "Read the working"}
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">Subject marks</p>
            <NotebookPen className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {formatNumber(data.academic.length)}
          </p>
          <Link
            href="/tracker/academic"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            Academic tracker
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">Exams</p>
            <BookOpenCheck className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {formatNumber(data.exams.length)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {pendingExams.length} pending
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">Applications</p>
            <ListTodo className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {formatNumber(data.applications.length)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {activeApplications.length} active
          </p>
        </div>

        <ChoiceCountCard />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Profile completeness</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {completeness.filled} of {completeness.total} optional planning
                  fields set
                </p>
              </div>
              <Badge variant={completeness.percent === 100 ? "success" : "outline"}>
                {completeness.percent}%
              </Badge>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/profile">Edit profile</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/pathways">Read admission pathways</Link>
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Recent applications</h2>
              <Link
                href="/tracker/applications"
                className="text-[11px] font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            {data.applications.length === 0 ? (
              <div className="px-5 py-7 text-center">
                <ListTodo className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No applications tracked</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Open a college profile and add it to your application log.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {data.applications.slice(0, 4).map((application) => (
                  <li
                    key={application.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                  >
                    <div>
                      <p className="text-[12px] font-medium">
                        {application.collegeName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {application.branchName ?? "Branch not recorded"} ·{" "}
                        {application.counsellingYear}
                      </p>
                    </div>
                    <Badge variant={stageTone(application.stage)}>
                      {application.stage}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-primary/20 bg-accent/25 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary" />
              Suggested next steps
            </h2>
            {nextSteps.length === 0 ? (
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Your record is complete enough to use. Keep the stages current
                after each official round, and check the public cutoff tables
                whenever a rule or a rank changes.
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {nextSteps.map((step) => (
                  <li key={step.title}>
                    <p className="text-[12px] font-medium">{step.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                    <Link
                      href={step.href}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      {step.cta}
                      <ArrowRight className="size-3" />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary" />
              Your data
            </h2>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Download a JSON copy or delete every tracker row. The choice list
              stays in this browser and is not part of the server export.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href="/api/account/export">Export JSON</a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/profile#data">Delete account</Link>
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <GraduationCap className="size-4 text-primary" />
              Public tools
            </h2>
            <div className="mt-3 grid gap-2">
              {[
                ["/colleges", "College explorer", "478 institutions"],
                ["/cutoffs?year=2026", "2026 cutoffs", "R3 cumulative close"],
                ["/predictor?year=2026", "Where you stand", "Published closes only"],
                ["/compare", "Compare colleges", "Up to four at once"],
              ].map(([href, label, hint]) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[12px] transition-colors hover:border-primary/30 hover:bg-muted/30"
                >
                  <span className="font-medium">{label}</span>
                  <span className="text-[10px] text-muted-foreground">{hint}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </TrackerShell>
  );
}

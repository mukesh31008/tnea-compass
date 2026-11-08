import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AcademicTracker, type AcademicRow } from "@/components/academic-tracker";
import { TrackerShell } from "@/components/tracker-shell";
import { Button } from "@/components/ui/button";
import { getAcademicRecords } from "@/lib/db/tracker";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Academic tracker",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AcademicPage() {
  const session = await requireUser("/tracker/academic");
  const records = await getAcademicRecords(session.user.id);

  const rows: AcademicRow[] = records.map((record) => ({
    id: record.id,
    classLevel: record.classLevel,
    subject: record.subject,
    mark: record.mark,
    maxMark: record.maxMark,
    examBoard: record.examBoard,
    notes: record.notes,
  }));

  return (
    <TrackerShell
      eyebrow="Private tracker"
      title="Academic marks"
      description="Keep your own subject marks in one place and see the Class 12 cutoff arithmetic. These entries are yours, not official data."
      actions={
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/tracker/results">
            View results
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      }
    >
      <AcademicTracker records={rows} />
    </TrackerShell>
  );
}

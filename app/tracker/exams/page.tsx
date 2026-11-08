import type { Metadata } from "next";

import { ExamTracker, type ExamRow } from "@/components/exam-tracker";
import { TrackerShell } from "@/components/tracker-shell";
import { getExamRecords } from "@/lib/db/tracker";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Exam tracker",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  const session = await requireUser("/tracker/exams");
  const exams = await getExamRecords(session.user.id);

  const rows: ExamRow[] = exams.map((exam) => ({
    id: exam.id,
    name: exam.name,
    category: exam.category,
    examDate: exam.examDate,
    status: exam.status,
    score: exam.score,
    rank: exam.rank,
    notes: exam.notes,
  }));

  return (
    <TrackerShell
      eyebrow="Private tracker"
      title="Exams and milestones"
      description="A private plan for board exams, entrance exams and TNEA counselling steps. Record a result only when it has actually been published."
    >
      <ExamTracker exams={rows} />
    </TrackerShell>
  );
}

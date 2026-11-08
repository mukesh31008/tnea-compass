import type { Metadata } from "next";

import {
  ApplicationTracker,
  type ApplicationRow,
} from "@/components/application-tracker";
import { TrackerShell } from "@/components/tracker-shell";
import { Badge } from "@/components/ui/badge";
import { getApplications } from "@/lib/db/tracker";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Application tracker",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireUser("/tracker/applications");
  const params = await searchParams;
  const applications = await getApplications(session.user.id);

  const rows: ApplicationRow[] = applications.map((application) => ({
    id: application.id,
    collegeCode: application.collegeCode,
    collegeName: application.collegeName,
    branchCode: application.branchCode,
    branchName: application.branchName,
    stage: application.stage,
    priority: application.priority,
    counsellingYear: application.counsellingYear,
    round: application.round,
    notes: application.notes,
  }));

  const prefillCode = first(params.collegeCode)?.slice(0, 12);
  const prefillName = first(params.collegeName)?.slice(0, 200);
  const alreadyTracked =
    prefillCode &&
    rows.some(
      (row) =>
        row.collegeCode === prefillCode &&
        row.branchCode === (first(params.branchCode) ?? ""),
    );

  return (
    <TrackerShell
      eyebrow="Private tracker"
      title="Applications and counselling"
      description="A private log of the colleges you are actually pursuing, with the stage you have reached. Separate from the local choice list."
      actions={
        prefillName && !alreadyTracked ? (
          <Badge variant="outline">Pre-filled from college profile</Badge>
        ) : undefined
      }
    >
      <ApplicationTracker
        applications={rows}
        prefill={
          prefillName && !alreadyTracked
            ? {
                collegeCode: prefillCode ?? "",
                collegeName: prefillName,
                branchCode: first(params.branchCode)?.slice(0, 12) ?? "",
                branchName: first(params.branchName)?.slice(0, 160) ?? "",
              }
            : undefined
        }
      />
    </TrackerShell>
  );
}

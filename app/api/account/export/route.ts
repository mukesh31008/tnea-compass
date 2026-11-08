import { getSession } from "@/lib/session";
import {
  getAcademicRecords,
  getApplications,
  getExamRecords,
  getStudentProfile,
} from "@/lib/db/tracker";

export const dynamic = "force-dynamic";

/**
 * A complete machine-readable copy of the rows the account owns. The local
 * choice list lives in browser storage and is deliberately not uploaded, so it
 * cannot be part of this server export.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: "Sign in to export your data." }, { status: 401 });
  }

  const [profile, academic, exams, applications] = await Promise.all([
    getStudentProfile(session.user.id),
    getAcademicRecords(session.user.id),
    getExamRecords(session.user.id),
    getApplications(session.user.id),
  ]);

  const payload = {
    exportVersion: 1,
    generatedAt: new Date().toISOString(),
    account: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      createdAt: session.user.createdAt,
    },
    profile,
    academicRecords: academic,
    examRecords: exams,
    applications,
    note: "The choice list is stored only in your browser and is not uploaded, so it is not included. Public cutoff data is not part of this export.",
  };

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="tnea-compass-account-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

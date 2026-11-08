import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  academicRecords,
  applications,
  examRecords,
  studentProfiles,
  type AcademicRecord,
  type Application,
  type ExamRecord,
  type StudentProfile,
} from "@/lib/db/schema";

export type TrackerData = {
  profile: StudentProfile | null;
  academic: AcademicRecord[];
  exams: ExamRecord[];
  applications: Application[];
};

export async function getStudentProfile(
  userId: string,
): Promise<StudentProfile | null> {
  const rows = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAcademicRecords(
  userId: string,
): Promise<AcademicRecord[]> {
  return db
    .select()
    .from(academicRecords)
    .where(eq(academicRecords.userId, userId))
    .orderBy(asc(academicRecords.classLevel), asc(academicRecords.subject));
}

export async function getExamRecords(userId: string): Promise<ExamRecord[]> {
  return db
    .select()
    .from(examRecords)
    .where(eq(examRecords.userId, userId))
    .orderBy(asc(examRecords.examDate), asc(examRecords.name));
}

export async function getApplications(userId: string): Promise<Application[]> {
  return db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(asc(applications.priority), asc(applications.collegeName));
}

export async function getTrackerData(userId: string): Promise<TrackerData> {
  const [profile, academic, exams, savedApplications] = await Promise.all([
    getStudentProfile(userId),
    getAcademicRecords(userId),
    getExamRecords(userId),
    getApplications(userId),
  ]);

  return { profile, academic, exams, applications: savedApplications };
}

/** Counts used by the dashboard. No values leave the user's own record. */
export function profileCompleteness(profile: StudentProfile | null): {
  filled: number;
  total: number;
  percent: number;
} {
  const fields = [
    profile?.displayName,
    profile?.district,
    profile?.schoolName,
    profile?.schoolType,
    profile?.medium,
    profile?.community,
  ];
  const filled = fields.filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  ).length;
  const total = fields.length;
  return { filled, total, percent: Math.round((filled / total) * 100) };
}

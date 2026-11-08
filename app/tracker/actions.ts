"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  academicRecords,
  account,
  applications,
  examRecords,
  session as sessionTable,
  studentProfiles,
  user,
} from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import {
  ACADEMIC_SUBJECTS,
  APPLICATION_STAGES,
  EXAM_CATEGORIES,
  EXAM_STATUSES,
  GENDERS,
  MEDIUMS,
  SCHOOL_TYPES,
} from "@/lib/tracker";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

async function ownerId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

const optionalNumber = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) return null;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
  },
  z.number().finite().nullable(),
);

const optionalRank = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) return null;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
  },
  z.number().int().min(1).nullable(),
);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const profileSchema = z.object({
  displayName: optionalText(80),
  phone: optionalText(20),
  district: optionalText(80),
  schoolName: optionalText(160),
  schoolType: z
    .string()
    .optional()
    .transform((value) =>
      value && (SCHOOL_TYPES as readonly string[]).includes(value)
        ? value
        : null,
    ),
  medium: z
    .string()
    .optional()
    .transform((value) =>
      value && (MEDIUMS as readonly string[]).includes(value) ? value : null,
    ),
  community: optionalText(8),
  gender: z
    .string()
    .optional()
    .transform((value) =>
      value && (GENDERS as readonly string[]).includes(value) ? value : null,
    ),
});

export async function saveProfile(input: unknown): Promise<ActionResult> {
  const userId = await ownerId();
  if (!userId) return fail("Sign in again to save your profile.");

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Check the profile fields and try again.");
  }

  const now = new Date();
  await db
    .insert(studentProfiles)
    .values({ userId, ...parsed.data, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: studentProfiles.userId,
      set: { ...parsed.data, updatedAt: now },
    });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

const academicSchema = z.object({
  classLevel: z.coerce.number().int().refine((value) => [10, 11, 12].includes(value)),
  subject: z
    .string()
    .refine((value) => (ACADEMIC_SUBJECTS as readonly string[]).includes(value)),
  mark: z.coerce.number().min(0).max(1000),
  maxMark: z.coerce.number().positive().max(1000),
  examBoard: optionalText(80),
  notes: optionalText(300),
});

export async function saveAcademicRecord(input: unknown): Promise<ActionResult> {
  const userId = await ownerId();
  if (!userId) return fail("Sign in again to save marks.");

  const parsed = academicSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Enter a subject and a mark that fits the maximum.");
  }
  if (parsed.data.mark > parsed.data.maxMark) {
    return fail("The mark cannot be higher than the maximum mark.");
  }

  const now = new Date();
  const { classLevel, subject, ...rest } = parsed.data;

  await db
    .insert(academicRecords)
    .values({
      id: crypto.randomUUID(),
      userId,
      classLevel,
      subject,
      ...rest,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        academicRecords.userId,
        academicRecords.classLevel,
        academicRecords.subject,
      ],
      set: { ...rest, updatedAt: now },
    });

  revalidatePath("/tracker/academic");
  revalidatePath("/tracker/results");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteAcademicRecord(id: string): Promise<ActionResult> {
  const userId = await ownerId();
  if (!userId) return fail("Sign in again to change marks.");

  await db
    .delete(academicRecords)
    .where(
      and(eq(academicRecords.id, id), eq(academicRecords.userId, userId)),
    );

  revalidatePath("/tracker/academic");
  revalidatePath("/tracker/results");
  revalidatePath("/dashboard");
  return { ok: true };
}

const examSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  category: z
    .string()
    .refine((value) => (EXAM_CATEGORIES as readonly string[]).includes(value)),
  examDate: optionalText(20),
  status: z
    .string()
    .refine((value) => (EXAM_STATUSES as readonly string[]).includes(value)),
  score: optionalNumber,
  rank: optionalRank,
  notes: optionalText(400),
});

export async function saveExamRecord(input: unknown): Promise<ActionResult> {
  const userId = await ownerId();
  if (!userId) return fail("Sign in again to save an exam.");

  const parsed = examSchema.safeParse(input);
  if (!parsed.success) return fail("Check the exam name, category and status.");

  const now = new Date();
  const { id, ...values } = parsed.data;

  if (id) {
    await db
      .update(examRecords)
      .set({ ...values, updatedAt: now })
      .where(and(eq(examRecords.id, id), eq(examRecords.userId, userId)));
  } else {
    await db.insert(examRecords).values({
      id: crypto.randomUUID(),
      userId,
      ...values,
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidatePath("/tracker/exams");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteExamRecord(id: string): Promise<ActionResult> {
  const userId = await ownerId();
  if (!userId) return fail("Sign in again to change exams.");

  await db
    .delete(examRecords)
    .where(and(eq(examRecords.id, id), eq(examRecords.userId, userId)));

  revalidatePath("/tracker/exams");
  revalidatePath("/dashboard");
  return { ok: true };
}

const applicationSchema = z.object({
  id: z.string().optional(),
  collegeCode: z.string().trim().min(1).max(12),
  collegeName: z.string().trim().min(1).max(200),
  branchCode: optionalText(12),
  branchName: optionalText(160),
  stage: z
    .string()
    .refine((value) => (APPLICATION_STAGES as readonly string[]).includes(value)),
  priority: z.coerce.number().int().min(1).max(50).default(1),
  counsellingYear: z.coerce
    .number()
    .int()
    .min(2020)
    .max(2035)
    .default(2026),
  round: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return null;
      const numeric = Number(value);
      return Number.isNaN(numeric) ? value : numeric;
    },
    z.number().int().min(1).max(10).nullable(),
  ),
  notes: optionalText(500),
});

export async function saveApplication(input: unknown): Promise<ActionResult> {
  const userId = await ownerId();
  if (!userId) return fail("Sign in again to save an application.");

  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Enter a college, branch if known, and a stage.");
  }

  const now = new Date();
  const { id, ...values } = parsed.data;
  const branchCode = values.branchCode ?? "";

  try {
    if (id) {
      await db
        .update(applications)
        .set({ ...values, branchCode, updatedAt: now })
        .where(and(eq(applications.id, id), eq(applications.userId, userId)));
    } else {
      await db.insert(applications).values({
        id: crypto.randomUUID(),
        userId,
        ...values,
        branchCode,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch {
    return fail(
      "That college and branch are already in your tracker. Edit the existing row instead.",
    );
  }

  revalidatePath("/tracker/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setApplicationStage(
  id: string,
  stage: string,
): Promise<ActionResult> {
  const userId = await ownerId();
  if (!userId) return fail("Sign in again to change an application.");
  if (!(APPLICATION_STAGES as readonly string[]).includes(stage)) {
    return fail("Choose a valid application stage.");
  }

  await db
    .update(applications)
    .set({ stage, updatedAt: new Date() })
    .where(and(eq(applications.id, id), eq(applications.userId, userId)));

  revalidatePath("/tracker/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteApplication(id: string): Promise<ActionResult> {
  const userId = await ownerId();
  if (!userId) return fail("Sign in again to change applications.");

  await db
    .delete(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)));

  revalidatePath("/tracker/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Deletes the account row. Foreign keys cascade to sessions, profile, marks,
 * exams and applications, so no private row survives. The local choice list is
 * browser storage and is not touched by the server.
 */
export async function deleteAccount(): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user) return fail("Sign in again to delete the account.");

  await auth.api.signOut({ headers: await headers() });

  // Explicit child deletes keep the guarantee even if a SQLite connection
  // was opened without `PRAGMA foreign_keys = ON`.
  await db.transaction(async (tx) => {
    await tx
      .delete(academicRecords)
      .where(eq(academicRecords.userId, session.user.id));
    await tx.delete(examRecords).where(eq(examRecords.userId, session.user.id));
    await tx
      .delete(applications)
      .where(eq(applications.userId, session.user.id));
    await tx
      .delete(studentProfiles)
      .where(eq(studentProfiles.userId, session.user.id));
    await tx.delete(sessionTable).where(eq(sessionTable.userId, session.user.id));
    await tx.delete(account).where(eq(account.userId, session.user.id));
    await tx.delete(user).where(eq(user.id, session.user.id));
  });

  redirect("/");
}

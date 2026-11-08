/**
 * Shared tracker vocabulary and calculations. These are user-entered values,
 * never official data. The cutoff arithmetic is shown openly so a student can
 * check it against the official TNEA formula.
 */

export const CLASS_LEVELS = [
  { value: 10, label: "Class 10" },
  { value: 11, label: "Class 11" },
  { value: 12, label: "Class 12" },
] as const;

export const ACADEMIC_SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Tamil",
  "English",
  "Business Maths",
  "Commerce",
  "Accountancy",
  "Economics",
  "Statistics",
  "Other",
] as const;

export const CUTOFF_SUBJECTS = ["Mathematics", "Physics", "Chemistry"] as const;

export const APPLICATION_STAGES = [
  "Researching",
  "Shortlisted",
  "Applied",
  "Allotted",
  "Accepted",
  "Declined",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const EXAM_STATUSES = [
  "Planned",
  "Registered",
  "Appeared",
  "Result awaited",
  "Result received",
] as const;

export const EXAM_CATEGORIES = [
  "TNEA counselling",
  "Entrance exam",
  "Board exam",
  "Other",
] as const;

export const SCHOOL_TYPES = [
  "Government",
  "Government Aided",
  "Private",
  "Other",
] as const;

export const MEDIUMS = ["Tamil", "English", "Other"] as const;

export const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"] as const;

export type SubjectMark = {
  subject: string;
  mark: number;
  maxMark: number;
};

export type CutoffResult = {
  cutoff: number | null;
  missing: string[];
  /** The same arithmetic written out, so nothing is hidden. */
  working: { subject: string; normalised: number }[];
};

/**
 * TNEA engineering cutoff = Mathematics + Physics/2 + Chemistry/2, out of 200.
 * A mark entered out of a different maximum is normalised to 100 first. The
 * result is arithmetic on the student's own marks, not an official rank.
 */
export function computeEngineeringCutoff(
  records: SubjectMark[],
): CutoffResult {
  const working: { subject: string; normalised: number }[] = [];
  const missing: string[] = [];

  for (const subject of CUTOFF_SUBJECTS) {
    const record = records.find(
      (item) => item.subject === subject && item.maxMark > 0,
    );
    if (!record) {
      missing.push(subject);
      continue;
    }
    working.push({
      subject,
      normalised: (record.mark / record.maxMark) * 100,
    });
  }

  if (missing.length > 0) {
    return { cutoff: null, missing, working };
  }

  const maths = working.find((item) => item.subject === "Mathematics");
  const physics = working.find((item) => item.subject === "Physics");
  const chemistry = working.find((item) => item.subject === "Chemistry");
  if (!maths || !physics || !chemistry) {
    return { cutoff: null, missing, working };
  }

  const cutoff =
    maths.normalised + physics.normalised / 2 + chemistry.normalised / 2;

  return {
    cutoff: Math.round(cutoff * 1000) / 1000,
    missing: [],
    working,
  };
}

export function stageTone(
  stage: string,
): "default" | "success" | "warning" | "outline" | "destructive" {
  if (stage === "Accepted") return "success";
  if (stage === "Allotted") return "default";
  if (stage === "Applied") return "warning";
  if (stage === "Declined") return "destructive";
  return "outline";
}

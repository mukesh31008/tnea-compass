import { relations } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * An official document used as evidence for a public fact. The hash is of the
 * exact PDF that was parsed, so a changed document cannot silently replace the
 * source of a published value.
 */
export const sourceDocuments = sqliteTable(
  "source_documents",
  {
    id: text("id").primaryKey(),
    authority: text("authority").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    retrievedAt: text("retrieved_at").notNull(),
    /** Only set when the document itself states a publication date. */
    publishedAt: text("published_at"),
    sha256: text("sha256").notNull(),
    pageCount: integer("page_count").notNull(),
    documentType: text("document_type").notNull(),
    year: integer("year").notNull(),
    round: integer("round"),
    status: text("status").notNull(),
    notes: text("notes"),
  },
  (table) => [
    index("source_documents_year_idx").on(table.year),
    index("source_documents_type_idx").on(table.documentType),
  ],
);

/**
 * A TNEA college. `code` is the four-character TNEA code (for example "0001"
 * for CEG). Values that the source did not report are stored as null and are
 * rendered as "Not reported" in the UI.
 */
export const colleges = sqliteTable(
  "colleges",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    shortName: text("short_name"),
    district: text("district"),
    type: text("type").notNull(),
    autonomous: integer("autonomous", { mode: "boolean" }),
    minority: integer("minority", { mode: "boolean" }),
    address: text("address"),
    taluk: text("taluk"),
    pincode: text("pincode"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    establishedYear: integer("established_year"),
    transportAvailable: integer("transport_available", { mode: "boolean" }),
    sourceDocumentId: text("source_document_id").references(
      () => sourceDocuments.id,
      { onDelete: "set null" },
    ),
  },
  (table) => [
    index("colleges_district_idx").on(table.district),
    index("colleges_type_idx").on(table.type),
    index("colleges_name_idx").on(table.name),
  ],
);

/** The TNEA branch/course master list. */
export const branches = sqliteTable("branches", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  sourceDocumentId: text("source_document_id").references(
    () => sourceDocuments.id,
    { onDelete: "set null" },
  ),
});

/**
 * A branch offered by a college. Most colleges have one row per branch code.
 * PERI (1452) is the exception: its two AM programmes are stored separately
 * because they are genuinely different courses sharing one code.
 */
export const collegeBranches = sqliteTable(
  "college_branches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    collegeCode: text("college_code")
      .notNull()
      .references(() => colleges.code, { onDelete: "cascade" }),
    branchCode: text("branch_code")
      .notNull()
      .references(() => branches.code, { onDelete: "restrict" }),
    branchName: text("branch_name").notNull(),
    approvedIntake: integer("approved_intake"),
    yearStarted: integer("year_started"),
    nba: integer("nba", { mode: "boolean" }),
    nbaValidUpto: integer("nba_valid_upto"),
  },
  (table) => [
    uniqueIndex("college_branches_unique_idx").on(
      table.collegeCode,
      table.branchCode,
      table.branchName,
    ),
    index("college_branches_college_idx").on(table.collegeCode),
    index("college_branches_branch_idx").on(table.branchCode),
  ],
);

/**
 * Yearly closing values. A closing value always belongs to a year and a
 * community. For 2020–2025 the community is the candidate's community as
 * recorded in the archived export. For 2026 the official TNEA tables group the
 * close by the community against which the seat was allotted.
 *
 * Closing ranks are stored for 2025 and 2026 only. The archived 2024 per-year
 * rank export is an exact duplicate of 2025, so its ranks are not used.
 */
export const cutoffs = sqliteTable(
  "cutoffs",
  {
    collegeBranchId: integer("college_branch_id")
      .notNull()
      .references(() => collegeBranches.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    community: text("community").notNull(),
    cutoffMark: real("cutoff_mark"),
    generalRank: integer("general_rank"),
    /** TNEA tie-break suffix on a closing rank (for example "A" in 1088A). */
    rankSuffix: text("rank_suffix"),
    candidateCount: integer("candidate_count"),
    method: text("method"),
    sourceDocumentId: text("source_document_id").references(
      () => sourceDocuments.id,
      { onDelete: "set null" },
    ),
    sourcePage: integer("source_page"),
    sourceRound: integer("source_round"),
  },
  (table) => [
    primaryKey({ columns: [table.collegeBranchId, table.year, table.community] }),
    index("cutoffs_year_community_idx").on(table.year, table.community),
    index("cutoffs_mark_idx").on(table.cutoffMark),
    index("cutoffs_rank_idx").on(table.generalRank),
  ],
);

/**
 * The cumulative close after each official counselling round. A row with
 * `round = 2` is the close using every allotment in Rounds 1 and 2, not only
 * the candidates newly allotted in Round 2.
 */
export const roundCutoffs = sqliteTable(
  "round_cutoffs",
  {
    collegeBranchId: integer("college_branch_id")
      .notNull()
      .references(() => collegeBranches.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    community: text("community").notNull(),
    round: integer("round").notNull(),
    cutoffMark: real("cutoff_mark"),
    generalRank: integer("general_rank"),
    rankSuffix: text("rank_suffix"),
    candidateCount: integer("candidate_count"),
    sourceDocumentId: text("source_document_id").references(
      () => sourceDocuments.id,
      { onDelete: "set null" },
    ),
    sourcePage: integer("source_page"),
    /** Round of the last-ranked candidate, which may be earlier than `round`. */
    sourceRound: integer("source_round"),
  },
  (table) => [
    primaryKey({
      columns: [
        table.collegeBranchId,
        table.year,
        table.community,
        table.round,
      ],
    }),
    index("round_cutoffs_year_community_idx").on(table.year, table.community),
  ],
);

/** Seats offered and allotted per branch per year. */
export const seatMatrix = sqliteTable(
  "seat_matrix",
  {
    collegeBranchId: integer("college_branch_id")
      .notNull()
      .references(() => collegeBranches.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    totalSeats: integer("total_seats").notNull(),
    allotted: integer("allotted"),
    vacant: integer("vacant"),
    sourceDocumentId: text("source_document_id").references(
      () => sourceDocuments.id,
      { onDelete: "set null" },
    ),
    sourcePage: integer("source_page"),
  },
  (table) => [
    primaryKey({ columns: [table.collegeBranchId, table.year] }),
    index("seat_matrix_year_idx").on(table.year),
  ],
);

/**
 * Vacancies reported after a counselling round, split by community. A missing
 * row means the vacancy was not reported, not that it was zero.
 */
export const vacancies = sqliteTable(
  "vacancies",
  {
    collegeBranchId: integer("college_branch_id")
      .notNull()
      .references(() => collegeBranches.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    community: text("community").notNull(),
    vacantSeats: integer("vacant_seats").notNull(),
    sourceDocumentId: text("source_document_id").references(
      () => sourceDocuments.id,
      { onDelete: "set null" },
    ),
    sourcePage: integer("source_page"),
  },
  (table) => [
    primaryKey({
      columns: [table.collegeBranchId, table.year, table.community],
    }),
    index("vacancies_year_community_idx").on(table.year, table.community),
  ],
);

/** Hostel availability by college. */
export const hostels = sqliteTable("hostels", {
  collegeCode: text("college_code")
    .primaryKey()
    .references(() => colleges.code, { onDelete: "cascade" }),
  boysAvailable: integer("boys_available", { mode: "boolean" }),
  girlsAvailable: integer("girls_available", { mode: "boolean" }),
});

/**
 * Reported fee information from the 2023 college information booklet.
 * `establishmentFee` is the booklet's "Establishment Charges" (a hostel
 * charge), not tuition and not a total annual hostel cost.
 */
export const fees = sqliteTable("fees", {
  collegeCode: text("college_code")
    .primaryKey()
    .references(() => colleges.code, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  tuitionFee: integer("tuition_fee"),
  admissionFee: integer("admission_fee"),
  establishmentFee: integer("establishment_fee"),
  hostelFee: integer("hostel_fee"),
  transportMinFee: integer("transport_min_fee"),
  transportMaxFee: integer("transport_max_fee"),
});

export const collegesRelations = relations(colleges, ({ many, one }) => ({
  branches: many(collegeBranches),
  hostel: one(hostels, {
    fields: [colleges.code],
    references: [hostels.collegeCode],
  }),
  fees: one(fees, {
    fields: [colleges.code],
    references: [fees.collegeCode],
  }),
}));

export const branchesRelations = relations(branches, ({ many }) => ({
  colleges: many(collegeBranches),
}));

export const collegeBranchesRelations = relations(collegeBranches, ({ one, many }) => ({
  college: one(colleges, {
    fields: [collegeBranches.collegeCode],
    references: [colleges.code],
  }),
  branch: one(branches, {
    fields: [collegeBranches.branchCode],
    references: [branches.code],
  }),
  cutoffs: many(cutoffs),
  roundCutoffs: many(roundCutoffs),
  seats: many(seatMatrix),
  vacancies: many(vacancies),
}));

export const cutoffsRelations = relations(cutoffs, ({ one }) => ({
  collegeBranch: one(collegeBranches, {
    fields: [cutoffs.collegeBranchId],
    references: [collegeBranches.id],
  }),
  sourceDocument: one(sourceDocuments, {
    fields: [cutoffs.sourceDocumentId],
    references: [sourceDocuments.id],
  }),
}));

export const roundCutoffsRelations = relations(roundCutoffs, ({ one }) => ({
  collegeBranch: one(collegeBranches, {
    fields: [roundCutoffs.collegeBranchId],
    references: [collegeBranches.id],
  }),
  sourceDocument: one(sourceDocuments, {
    fields: [roundCutoffs.sourceDocumentId],
    references: [sourceDocuments.id],
  }),
}));

export const seatMatrixRelations = relations(seatMatrix, ({ one }) => ({
  collegeBranch: one(collegeBranches, {
    fields: [seatMatrix.collegeBranchId],
    references: [collegeBranches.id],
  }),
  sourceDocument: one(sourceDocuments, {
    fields: [seatMatrix.sourceDocumentId],
    references: [sourceDocuments.id],
  }),
}));

export const vacanciesRelations = relations(vacancies, ({ one }) => ({
  collegeBranch: one(collegeBranches, {
    fields: [vacancies.collegeBranchId],
    references: [collegeBranches.id],
  }),
  sourceDocument: one(sourceDocuments, {
    fields: [vacancies.sourceDocumentId],
    references: [sourceDocuments.id],
  }),
}));

export const hostelsRelations = relations(hostels, ({ one }) => ({
  college: one(colleges, {
    fields: [hostels.collegeCode],
    references: [colleges.code],
  }),
}));

export const feesRelations = relations(fees, ({ one }) => ({
  college: one(colleges, {
    fields: [fees.collegeCode],
    references: [colleges.code],
  }),
}));

export type College = typeof colleges.$inferSelect;
export type NewCollege = typeof colleges.$inferInsert;
export type Branch = typeof branches.$inferSelect;
export type CollegeBranch = typeof collegeBranches.$inferSelect;
export type Cutoff = typeof cutoffs.$inferSelect;
export type RoundCutoff = typeof roundCutoffs.$inferSelect;
export type SeatMatrix = typeof seatMatrix.$inferSelect;
export type Vacancy = typeof vacancies.$inferSelect;
export type SourceDocument = typeof sourceDocuments.$inferSelect;
export type Hostel = typeof hostels.$inferSelect;
export type Fee = typeof fees.$inferSelect;

/* ------------------------------------------------------------------ */
/* Accounts and private tracker                                       */
/* ------------------------------------------------------------------ */

/**
 * Better Auth core tables. Profile facts live in `student_profiles` so the
 * authentication record stays minimal: an id, a name, an email and a session.
 */
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

/**
 * Private student profile. Every field is optional except the owner link; a
 * student can use the trackers without disclosing school or community.
 */
export const studentProfiles = sqliteTable("student_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  phone: text("phone"),
  district: text("district"),
  schoolName: text("school_name"),
  schoolType: text("school_type"),
  medium: text("medium"),
  community: text("community"),
  gender: text("gender"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/**
 * One subject mark for one class level. These are user-entered values and are
 * never mixed with the official cutoff tables.
 */
export const academicRecords = sqliteTable(
  "academic_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    classLevel: integer("class_level").notNull(),
    subject: text("subject").notNull(),
    mark: real("mark").notNull(),
    maxMark: real("max_mark").notNull(),
    examBoard: text("exam_board"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("academic_records_owner_subject_idx").on(
      table.userId,
      table.classLevel,
      table.subject,
    ),
  ],
);

/** Entrance or school exams the student plans to take or has taken. */
export const examRecords = sqliteTable(
  "exam_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    examDate: text("exam_date"),
    status: text("status").notNull(),
    score: real("score"),
    rank: integer("rank"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("exam_records_user_idx").on(table.userId)],
);

/**
 * A private application/counselling tracker. It is separate from the public
 * choice list: a saved choice is an option, an application is a decision the
 * student is actually pursuing.
 */
export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    collegeCode: text("college_code").notNull(),
    collegeName: text("college_name").notNull(),
    branchCode: text("branch_code").notNull().default(""),
    branchName: text("branch_name"),
    stage: text("stage").notNull(),
    priority: integer("priority").notNull().default(1),
    counsellingYear: integer("counselling_year").notNull(),
    round: integer("round"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("applications_owner_programme_idx").on(
      table.userId,
      table.collegeCode,
      table.branchCode,
    ),
    index("applications_user_idx").on(table.userId),
  ],
);

/**
 * An opt-in snapshot of the browser choice list. It is only written when the
 * signed-in student presses "Save to account"; nothing is uploaded silently.
 * The payload is the same validated ChoiceRecord array used by localStorage.
 */
export const choiceLists = sqliteTable("choice_lists", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(studentProfiles, {
    fields: [user.id],
    references: [studentProfiles.userId],
  }),
  academicRecords: many(academicRecords),
  examRecords: many(examRecords),
  applications: many(applications),
  choiceList: one(choiceLists, {
    fields: [user.id],
    references: [choiceLists.userId],
  }),
  sessions: many(session),
  accounts: many(account),
}));

export const studentProfilesRelations = relations(
  studentProfiles,
  ({ one }) => ({
    user: one(user, {
      fields: [studentProfiles.userId],
      references: [user.id],
    }),
  }),
);

export const academicRecordsRelations = relations(
  academicRecords,
  ({ one }) => ({
    user: one(user, {
      fields: [academicRecords.userId],
      references: [user.id],
    }),
  }),
);

export const examRecordsRelations = relations(examRecords, ({ one }) => ({
  user: one(user, {
    fields: [examRecords.userId],
    references: [user.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(user, {
    fields: [applications.userId],
    references: [user.id],
  }),
}));

export const choiceListsRelations = relations(choiceLists, ({ one }) => ({
  user: one(user, {
    fields: [choiceLists.userId],
    references: [user.id],
  }),
}));

export type User = typeof user.$inferSelect;
export type StudentProfile = typeof studentProfiles.$inferSelect;
export type AcademicRecord = typeof academicRecords.$inferSelect;
export type ExamRecord = typeof examRecords.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type ChoiceList = typeof choiceLists.$inferSelect;

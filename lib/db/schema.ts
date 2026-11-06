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
 * Yearly closing marks. Closing ranks are only stored for 2025 because the
 * archived 2024 rank export is an exact duplicate of 2025.
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
  },
  (table) => [
    primaryKey({ columns: [table.collegeBranchId, table.year, table.community] }),
    index("cutoffs_year_community_idx").on(table.year, table.community),
    index("cutoffs_mark_idx").on(table.cutoffMark),
    index("cutoffs_rank_idx").on(table.generalRank),
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
  },
  (table) => [
    primaryKey({ columns: [table.collegeBranchId, table.year] }),
    index("seat_matrix_year_idx").on(table.year),
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
  seats: many(seatMatrix),
}));

export const cutoffsRelations = relations(cutoffs, ({ one }) => ({
  collegeBranch: one(collegeBranches, {
    fields: [cutoffs.collegeBranchId],
    references: [collegeBranches.id],
  }),
}));

export const seatMatrixRelations = relations(seatMatrix, ({ one }) => ({
  collegeBranch: one(collegeBranches, {
    fields: [seatMatrix.collegeBranchId],
    references: [collegeBranches.id],
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
export type SeatMatrix = typeof seatMatrix.$inferSelect;
export type Hostel = typeof hostels.$inferSelect;
export type Fee = typeof fees.$inferSelect;

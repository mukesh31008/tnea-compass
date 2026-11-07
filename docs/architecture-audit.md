# Architecture audit — Stage 0

Date: 7 November 2026
Scope: the existing TNEA Compass application, before the student-platform
expansion described in PRD v1.0.

This document records what exists, what was found to be wrong, what has been
fixed in Stage 0, and what must change before the first-release acceptance
criteria can be met. It is intentionally conservative: anything that has not
been checked against an official source is described as unverified.

## 1. Current stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 15.5 App Router | Server components and server-side queries |
| UI | React 19, TypeScript 5, Tailwind CSS v4 | Hand-built shadcn-style primitives, Radix packages |
| Database | SQLite locally via `@libsql/client` | Turso/libSQL is the intended hosted option |
| ORM | Drizzle ORM + drizzle-kit | SQLite dialect, generated migrations in `drizzle/` |
| Validation | Zod | Used at API/input boundaries where present |
| Auth | Better Auth installed, **not configured** | No schema, handler, session helper or route exists |
| AI | `ai` + OpenAI-compatible provider | Optional; no assistant route exists yet |
| Tests | Vitest | Unit and seed-integrity tests only |
| Lint/format | ESLint (`eslint-config-next`) | No separate formatter configured |
| Data build | Python 3 ETL (`scripts/etl.py`) | Deterministic gzip output |

Local commands require Node 22 on `PATH` in this environment:

```bash
export PATH=/home/mukesh_m/.local/node22/bin:$PATH
```

## 2. Route map

| Route | Type | Status |
| --- | --- | --- |
| `/` | Server page | Working landing page with search and rank form |
| `/colleges` | Server page | Working explorer, filters and pagination |
| `/colleges/[code]` | Server page | Working profile: branches, cutoffs, seats, fees, hostel |
| `/cutoffs` | Server page | Working six-year cutoff explorer with sparklines |
| `/predictor` | Server page | Working position comparison (rank or cutoff) |
| `/compare` | Server page | Working side-by-side comparison, up to four colleges |
| `/choices` | Client page | Working local-first choice list with reorder, print, CSV |
| `/api/colleges/search` | Route handler | Working search endpoint used by the command palette |
| `/sign-in` | Not implemented | Linked from the header; currently 404 |
| `/dashboard` | Not implemented | Linked from the footer; currently 404 |
| `/assistant` | Not implemented | Linked from the footer; currently 404 |
| `/about` | Not implemented | Linked from the footer anchors; currently 404 |

The four missing routes are existing navigation promises and must be resolved
before this build is presented as complete. Stage 1 replaces the sign-in and
dashboard placeholders; the assistant stays optional and the about page becomes
the public methodology/provenance page.

## 3. Data model

Public reference tables in `lib/db/schema.ts`:

- `colleges` — 450 rows, keyed by four-digit TNEA college code.
- `branches` — 122 rows, keyed by TNEA branch code.
- `college_branches` — 3,756 rows, the programme identity used by cutoffs,
  seats and choices.
- `cutoffs` — 63,454 rows keyed by programme, year and community. Closing
  marks for 2020–2025; closing ranks for 2025 only.
- `seat_matrix` — 18,900 rows keyed by programme and year.
- `hostels` — 444 rows.
- `fees` — 444 rows from the 2023 college information booklet.

Canonical counts and notes live in `data/seed/manifest.json`. Missing values are
`NULL` and are rendered as “Not reported”; the UI must not substitute zero.

There are **no student-owned tables** yet. There is no user, profile, subject,
assessment, exam, result, application or task table. There is also no
`source_documents`, `admission_cycles`, `eligibility_rules` or
`admission_deadlines` table, so the PRD's verification and versioning
requirements cannot be represented yet.

### Semantic rules that must not be broken

- A TNEA **general rank** is not a community rank. Community-specific closing
  values must always carry their community.
- A cutoff **mark** and a closing **rank** are different measures. The current
  predictor compares like with like and does not convert between them.
- 2025 closing ranks must never be described as 2024–2025 ranks. The archived
  2024 rank export was an exact duplicate of 2025 and was discarded.
- A closing value belongs to a year and a community. Any export that drops
  either field is lossy and must say so.

## 4. Data provenance — current state

The immediate source of the seed dataset is the archived JSON exports of the
original TNEA project, plus the 2023 college information booklet text. Those
exports were converted by `scripts/etl.py`.

What is known:

- 2020–2024 cutoff marks come from the all-years export after dropping
  rank-like values above 200 and keeping the highest mark per key.
- 2025 cutoff marks and ranks come from the 2025 export.
- The 2024 per-year rank export is an exact duplicate of 2025 and is not used.
- The 2025 PERI (1452) AI and Machine Learning ranks were patched from the
  archived college page because the source reused the Artificial Intelligence
  programme's ranks.
- Missing values are stored as `NULL`.

What is **not** yet established:

- The archived exports do not carry page-level references to official TNEA
  PDFs, so we cannot currently show a source page for each historical value.
- We have not independently re-derived every 2020–2025 value from official
  documents. The dataset should therefore be described as “compiled from the
  original project's archived exports”, not as “verified against official
  documents”.

The 2026 work changes this for the newest cycle. Official TNEA documents are
published under `https://static.tneaonline.org/docs/`, including the Round 1,
Round 2 and Round 3 provisional allotment lists, the seat matrix and the
post-Round-3 vacancy statement. The intended provenance model is:

- One `source_documents` row per PDF, with authority, title, URL, retrieval
  date, file hash, version and verification status.
- One evidence row per extracted close, including the document, page number
  and round.
- A `round_cutoffs` (or equivalent) table so the close after each round can be
  shown separately from the final close.
- The final close is the last-ranked deduplicated allotment in the final
  available round, not an average or an estimate.

Until that ingestion lands, the UI must keep saying that 2025 ranks are the only
ranks stored and that 2020–2024 values are marks without ranks.

## 5. Defects found and their status

### Fixed in Stage 0

1. **Predictor required both values.**
   `getPredictorCandidates` previously returned rows only when both the closing
   rank and the closing mark were present, and the UI filtered on both. Rank
   mode now requires only a rank; cutoff mode requires only a mark. Rows with a
   missing secondary value render “Not reported”.

2. **Choice entries lost community and year context.**
   A saved choice now carries `community` and `dataYear`. Legacy records are
   preserved with explicit `null` context and are flagged in the list instead of
   being silently labelled “OC 2025”.

3. **CSV headers asserted OC 2025.**
   The export now writes `community`, `data_year`, `closing_mark` and
   `closing_rank`, so the file reflects what was actually recorded.

4. **Probability language.**
   User-facing copy said “Check my chances”, “Chance predictor” and “Predict my
   chances”. Bands are distance readings, not calibrated probabilities. Copy now
   says “Where you stand”, “Read my position” and “distance reading, not an
   admission probability”. The internal band type was renamed from `ChanceBand`
   to `PositionBand`.

5. **Missing-value handling in results.**
   Predictor result rows no longer format `null` as a number; a missing mark or
   rank is shown as “Not reported” or “rank n/r”.

### Open

1. **No authentication or private data boundary.** Better Auth is a dependency
   only. `/sign-in` and `/dashboard` are dead links. No record ownership checks
   exist because no private records exist.
2. **No source/verification tables.** Public facts cannot show authority,
   document, page, publication date, last-verified date or version.
3. **Existing historical data lacks page-level provenance.** See section 4.
4. **No 2026 cycle in the database.** Official 2026 PDFs exist but have not been
   ingested. The UI currently says “2025 closing data”.
5. **No student data export or deletion workflow.** Cannot exist until accounts
   exist.
6. **No rate limiting, audit log, session hardening or incident-response
   documentation.** Required before collecting student records.
7. **No legal review recorded.** DPDP Act 2023 / DPDP Rules 2025 obligations for
   minors have not been assessed. This is a launch blocker, not an engineering
   task.
8. **Choice list is browser-local only.** It is not synced, not private to an
   account and disappears when browser storage is cleared. This is acceptable
   for guest mode but not for the PRD's account model.
9. **No end-to-end tests.** Unit and seed tests are meaningful but do not cover
   route rendering or a real browser flow.
10. **Seat totals can be incomplete.** Some colleges have partial 2025 seat
    rows. The UI must show “Not reported” rather than `0` when rows are absent.
11. **No fee/hostel records for some colleges.** `0002`, `0003`, `3011`, `3021`,
    `5012` and `5022` have no fee/hostel rows; “Not reported” is required.

## 6. Privacy and security audit

Current exposure is limited because there are no accounts and no student
records. The local choice list stores college and branch selections in
`localStorage` under `tnea-compass:choices:v1`; it contains no marks, ranks,
names or contact details.

Before Stage 1 collections begin:

- Configure Better Auth with a secret held outside source control and add the
  required auth tables through a migration.
- Enforce server-side ownership checks on every private read and write.
- Add rate limiting to authentication and sensitive endpoints.
- Add an audit log for account and record changes.
- Define backup and restore procedures for the database.
- Publish a minimal-collection policy and a deletion/export workflow.
- Obtain legal review of DPDP Act 2023 and DPDP Rules 2025 obligations,
  including the phased commencement dates and any children's-data requirements.

The product must not collect government identity numbers, examination
passwords, certificate scans or unnecessary sensitive information in the first
release.

## 7. Quality gates

Stage 0 passes:

```text
npm run typecheck   clean
npm run lint        clean
npm run test        32 tests passing
npm run build       successful production build
```

The test suite covers predictor band boundaries and input validation, choice
storage normalisation and CSV quoting, and seed counts/keys/referential
integrity. It does not yet cover authentication, ownership or route behaviour.

## 8. Migration plan

The PRD sequence is retained, with the data foundation pulled forward because
the UI cannot honestly show 2026 context without it.

| Stage | Work | Exit condition |
| --- | --- | --- |
| 0 | Audit, defect fixes, provenance documentation | This document; gates pass |
| 0.5 | Official 2026 ingestion | Source documents, page evidence, round closes, 2026 seat/vacancy data, manifest regenerated |
| 1 | Accounts and student foundation | Better Auth working; private profile; export/delete; ownership tests |
| 2 | Academic tracking | Subjects, assessments, marks with origin/verification labels; progress history |
| 3 | Examination tracking | Exam calendar, applications, manual results, deadline tasks |
| 4 | TNEA integration | Profile-aware TNEA tools; community/year context preserved end to end |
| 5 | Additional pathways | Medical, allied health, agriculture, JEE/JoSAA with versioned rules |
| 6 | Notifications and personalisation | Scheduled reminders, verified updates, explainable suggestions |

Each stage must keep the existing public tools working and must not destroy
data. Schema migrations are additive until a tested backup/restore procedure
exists.

## 9. Decisions still pending

- Product name: “TNEA Compass” clashes with an existing competitor. Shortlisted
  available names include `thelastrank.com`, `cutoffledger.com` and
  `paguthi.com`. Renaming is a separate decision and must include redirects.
- Visual identity: keep the current paper/ledger direction or commission a
  distinct identity. The requirement is a design that is visibly not a replica
  of the competitor sites.
- Hosted database: SQLite locally is fine; Turso or PostgreSQL must be chosen
  before multi-user launch, with a migration and backup plan.
- Deployment: not performed. Tokens and hosting accounts are required.

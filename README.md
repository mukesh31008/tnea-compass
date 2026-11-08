# TNEA Compass

An independent, data-first guide to Tamil Nadu engineering admissions. Search 478 colleges, read seven years of published TNEA cutoffs (2020–2026), compare a rank or cutoff with the published close, and keep a private plan.

> TNEA Compass is not affiliated with the Directorate of Technical Education, Tamil Nadu. Always verify decisions on [tneaonline.org](https://www.tneaonline.org).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 and a hand-built component system
- SQLite / libSQL with Drizzle ORM (Turso-ready)
- Better Auth email + password (optional; public tools work as a guest)
- Recharts, dnd-kit, cmdk
- Vitest for the cutoff and position logic

## Requirements

Node 22 (see `.nvmrc`).

```bash
nvm use
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Set a real `BETTER_AUTH_SECRET` before deploying (`openssl rand -base64 32`). The local fallback in `lib/auth.ts` exists only so a fresh checkout can boot without an `.env` file.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run test` | Unit tests |
| `npm run db:generate` | Generate migrations |
| `npm run db:migrate` | Apply migrations to the local database |
| `npm run db:seed` | Import the TNEA dataset |
| `npm run data:etl` | Rebuild normalized seed files from the original exports |
| `python3 scripts/ingest_2026.py --pdf-dir /tmp/opencode/tnea2026` | Re-verify and parse the official 2026 PDFs |

## Data

Compiled from published TNEA counselling records:

- **478 colleges**, 134 branches and 4,045 college–branch programmes
- **77,798 cutoff rows** across 2020–2026
- **29,063 closing ranks** for 2025 and 2026 only
- 22,254 seat-matrix rows, 24,692 round-close rows and 24,276 vacancy rows
- 6 official source documents with SHA-256 hashes

### How 2026 differs

The 2026 published cutoff lists group candidates by the **community the seat was allotted against**, not the candidate's own community. A 2026 close is therefore stored with:

- the final cumulative close across Rounds 1–3,
- the round in which the last-ranked candidate was allotted,
- the PDF page of that allotment,
- the community the seat was allotted against.

2020–2025 rows keep the candidate-community meaning. The UI never puts 2026 on the same year line as earlier marks, and never calls 2025 ranks “2024–2025”.

The archived 2024 rank export is an exact duplicate of 2025, so closing ranks are shown for 2025 and 2026 only. Missing values are shown as **Not reported**; nothing is filled in or estimated.

## Private tracker

Email/password accounts unlock a private, minimal planning record:

- profile (district, school type, medium, community — all optional)
- Class 10–12 subject marks and the cutoff arithmetic
- exams and counselling milestones
- applications and their current stage
- JSON export and full account deletion

Public college, cutoff, predictor and compare pages never require an account. The choice list stays local to the browser. Official data and user-entered data are stored and labelled separately; the tracker never writes into the public cutoff tables.

Privacy choices: no Aadhaar, date of birth, photographs, uploaded certificates or public profiles. Account deletion removes the profile, marks, exams and applications explicitly. The export route returns only rows owned by the signed-in account.

## Deployment checklist

1. Provision a libSQL/Turso database and set `DATABASE_URL` + `DATABASE_AUTH_TOKEN`.
2. Set `NEXT_PUBLIC_SITE_URL`, `BETTER_AUTH_URL` and a strong `BETTER_AUTH_SECRET`.
3. Run `npm run db:migrate` and `npm run db:seed` against that database.
4. Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.
5. Verify `/about#data` lists the six 2026 source PDFs and their hashes.
6. Do not enable email verification until a mail provider is configured.

## Status

The public data layer, 2026 ingest and private tracker are built. Deployment is intentionally manual and needs the operator's credentials.

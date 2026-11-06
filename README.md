# TNEA Compass

An independent, data-first guide to Tamil Nadu engineering admissions. Search 450 colleges, read six years of published TNEA cutoffs, compare your rank or cutoff with 2025 closing values, and build a counselling choice list you can explain.

> TNEA Compass is not affiliated with the Directorate of Technical Education, Tamil Nadu. Always verify decisions on [tneaonline.org](https://www.tneaonline.org).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 and a hand-built component system
- SQLite / libSQL with Drizzle ORM
- Recharts, dnd-kit, cmdk
- Better Auth (optional email + password)
- Vitest for the prediction engine

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

## Data

Compiled from published TNEA counselling records:

- 450 colleges and 3,756 college–branch programmes
- 63,454 cutoff marks across seven communities, 2020–2025
- 14,719 closing ranks for **2025 only**
- 18,900 seat-allotment rows
- Hostel availability and partial 2023 fee records

The archived 2024 rank export is an exact duplicate of 2025, so closing ranks are
shown for 2025 only. Missing values are shown as **Not reported**. The project
does not fabricate placements, NAAC grades or fees.

## Status

Under active build.

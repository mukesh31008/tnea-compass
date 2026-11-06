# TNEA Compass

An independent, data-first guide to Tamil Nadu engineering admissions. Search 447 colleges, read six years of published TNEA cutoffs, estimate your rank, and build a counselling choice list you can explain.

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
| `npm run db:seed` | Import the TNEA dataset |
| `npm run data:etl` | Rebuild normalized seed files |

## Data

Compiled from published TNEA counselling records, 2020–2025:

- 447 colleges and 3,234 college–branch combinations
- 250,453 cutoff observations across 7 communities
- 18,900 seat-allotment rows
- Hostel, transport and partial fee records

Missing values are shown as **Not reported**. The project does not fabricate placements, NAAC grades or fees.

## Status

Under active build.

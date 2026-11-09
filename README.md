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
| `npm run test:e2e` | Playwright smoke and axe checks (needs a seeded database) |
| `npm run db:generate` | Generate migrations |
| `npm run db:migrate` | Apply migrations to the local database |
| `npm run db:seed` | Import the TNEA dataset |
| `npm run data:etl` | Rebuild normalized seed files from the original exports |
| `npm run data:check` | Check source URLs and dataset age (`-- --hash` also verifies SHA-256) |
| `npm run data:backup` | Export a local Turso snapshot into `backups/` |
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

- the R3 cumulative close across Rounds 1–3,
- the round in which the last-ranked candidate was allotted,
- the PDF page of that allotment,
- the community the seat was allotted against.

2020–2025 rows keep the candidate-community meaning. The UI never puts 2026 on the same year line as earlier marks, and never calls 2025 ranks “2024–2025”.

The archived 2024 rank export is an exact duplicate of 2025, so closing ranks are shown for 2025 and 2026 only. Missing values are shown as **Not reported**; nothing is filled in or estimated.

## Ask the record

`/assistant` is a cited-answer tool, not a free-form chatbot. It accepts a
question, resolves a college/branch/community/year against the public dataset,
and returns one evidence card: the value, its community basis, the source round
and PDF page, caveats, and source links.

- Deterministic lookup works with **no AI key**. SQLite is the only source of
  values.
- An optional OpenAI-compatible model (`OPENAI_API_KEY`, `AI_BASE_URL`,
  `AI_MODEL`) is used only when the deterministic parser cannot resolve the
  college or comparison target. It maps the question onto a fixed schema; it
  never writes the answer and never sees private tracker data.
- It refuses admission chances, predictions, eligibility rulings, college advice,
  fee/placement claims, and rank-to-mark conversion.
- Missing values are reported as **Not reported**, never zero or an estimate.
- No conversation is stored. `POST /api/assistant` is rate-limited per client
  (20 requests/minute, 500-character question cap) and answers are cached in
  memory for five minutes.

Example questions:

```text
What was the 2026 OC close for CEG Computer Science?
Show the R1-R3 timeline for 0001 CS for BC.
Show the 2026 seat matrix for 0001.
Which colleges had the most vacancies in ECE after Round 3?
Compare 0001 and 2006 for Computer Science in 2026.
Where did the 2026 cutoff data come from?
```

## Private tracker

Email/password accounts unlock a private, minimal planning record:

- profile (district, school type, medium, community — all optional)
- Class 10–12 subject marks and the cutoff arithmetic
- exams and counselling milestones
- applications and their current stage
- JSON export and full account deletion

Public college, cutoff, predictor and compare pages never require an account. The choice list stays local to the browser by default. A signed-in student can explicitly press **Save to account** to store an opt-in copy; nothing is uploaded silently, and the saved copy can be deleted from the same screen. Official data and user-entered data are stored and labelled separately; the tracker never writes into the public cutoff tables.

Privacy choices: no Aadhaar, date of birth, photographs, uploaded certificates or public profiles. Account deletion removes the profile, marks, exams and applications explicitly. The export route returns only rows owned by the signed-in account.

## Deployment checklist

1. Provision a libSQL/Turso database and set `DATABASE_URL` + `DATABASE_AUTH_TOKEN`.
2. Set `NEXT_PUBLIC_SITE_URL`, `BETTER_AUTH_URL` and a strong `BETTER_AUTH_SECRET`.
   Production fails closed on auth if the secret is missing; it does not use a
   known fallback.
3. Run `npm run db:migrate` and `npm run db:seed` against that database.
4. Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.
5. Start the app and check:
   - `GET /api/health` returns `{ "status": "ok" }`
   - `GET /robots.txt` and `GET /sitemap.xml` use the production site URL
   - `/assistant` answers the sample questions with a source citation
   - `/about#data` lists the six 2026 source PDFs and their hashes
   - the security headers are present (`Content-Security-Policy`,
     `X-Frame-Options`, `Referrer-Policy`, HSTS in production)
6. Email is optional. Set `RESEND_API_KEY` and `EMAIL_FROM` to enable password
   reset and email verification. Without them the reset screen reports that mail
   is not configured instead of pretending to send.
7. Rate limiting is shared when `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` are set. Otherwise it falls back to a per-process
   fixed window.

`NEXT_PUBLIC_SITE_URL` must be the final HTTPS origin, without a trailing slash.
The sitemap, canonical metadata, auth callback and OpenGraph URLs all derive from
it.

### Deployment readiness files

- `app/robots.ts` — crawler rules and sitemap location
- `app/sitemap.ts` — public canonical routes
- `app/api/health/route.ts` — process + database probe
- `next.config.ts` — CSP, frame denial, referrer and permissions policy, HSTS
  in production
- `/api/assistant` — zod-validated, rate-limited, `no-store` answer endpoint
- `/api/choices` — session-gated, opt-in choice-list sync
- `.github/workflows/ci.yml` — typecheck, lint, unit tests, build, Playwright
  and axe checks
- `scripts/check-sources.ts` — monthly source and dataset-age check
- `scripts/backup-turso.sh` — point-in-time database export before a migration

### Optional services

| Variable | Enables | Without it |
| --- | --- | --- |
| `RESEND_API_KEY`, `EMAIL_FROM` | Password reset and verification mail | Reset UI says mail is not configured |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shared assistant rate limit | Per-instance in-memory limit |
| `OPENAI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | Model-assisted intent parsing only | Deterministic parser only |

Monitoring and backups are operational choices, not hidden dependencies. Add an
uptime check against `/api/health`, run `npm run data:backup` before a migration,
and run `npm run data:check` on a monthly schedule. The project does not send
data to a monitoring service unless the operator configures one.

## Status

The public data layer, 2026 ingest, private tracker, grounded assistant and
deployment readiness files are built. Deployment is intentionally manual and
needs the operator's credentials; no deployment has been performed from this
repository.

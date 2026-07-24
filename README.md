# DAS D.I.A.L — 50.003 Project

Prototype for DAS DIAL: PS4 (Error Pattern Analyzer) and PS6 (Intervention
Recommendation Engine). `client/` is the React frontend, `server/` is the
Express + Postgres backend.

## Prerequisites

- Node.js (v18+) and npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Postgres — no local Postgres install needed)

## 1. Install dependencies

```bash
cd client && npm install 
cd ../server && npm install
```

## 2. Environment setup

```bash
cp server/.env.example server/.env
```

Then fill in `server/.env`: (refer to telegram for the .env file)

| Variable            | Value                                                                           |
| ------------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`    | `postgresql://dial:dial@localhost:5432/dial` (matches `docker-compose.yml`) |
| `PORT`            | `3001`                                                                        |
| `OPENAI_BASE_URL` | your OpenAI-compatible endpoint                                                 |
| `OPENAI_API_KEY`  | your API key                                                                    |
| `MODEL`           | model name to use for analysis                                                  |

`server/.env` is gitignored — never commit it.

## 3. Database setup

From the repo root, start Postgres in Docker:

```bash
docker compose up -d
```

This runs Postgres 16 in a container named `db`, credentials `dial`/`dial`/`dial` (user/password/database), {all data in db is local} — see "Sharing data" below.

Apply the schema (`server/src/db/schema.sql`):

```bash
cd server
npm run db:apply
```

Re-running `db:apply`  — if you need to re-apply after wiping data,
drop and recreate the DB first:

```bash
docker compose down -v   # removes the container AND its volume (all data)
docker compose up -d
npm run db:apply
```

## 4. Run the app

Two terminals:

```bash
cd server && npm run dev   # http://localhost:3001
```

```bash
cd client && npm run dev   # http://localhost:5173
```

Check the backend + DB are wired up: `curl http://localhost:3001/api/health`
should return `{"status":"ok","db":"connected"}`.

## Using the database

### Adding a user with a real hashed password

There's no signup/login API yet, but you don't need raw SQL to create a
properly-hashed user either — `npm run db:seed` (from `server/`) hashes the
password with `hashPassword()`, inserts the `users` row plus the matching
role-extension row (`therapists`/`parents`/`students`/`admins`), then reads
the hash back from Postgres and confirms it with `verifyPassword()` — an
end-to-end test of hashing + storage together, not just the hashing function
in isolation.

```bash
cd server
npm run db:seed -- --username=therapist2 --password=Secret123 --name="Mr Ong" --role=therapist
```

`--role` is one of `admin` / `therapist` / `parent` / `student` (defaults to
`student` if omitted). Source: [`server/src/db/seed.ts`](server/src/db/seed.ts).

### Raw SQL access

For anything the seed script doesn't cover (relationships, writing samples,
etc.), data can also be added directly against the Postgres container with
`psql` (bundled in the Postgres image, no local install needed):

```bash
docker compose exec -T db psql -U dial -d dial
```

 That drops you into an interactive `psql` session against your local DB, or
pipe a `.sql` file in non-interactively:

```bash
docker compose exec -T db psql -U dial -d dial < some-script.sql
```

### Example: adding a therapist, a student, and a writing sample

```sql
insert into users (username, password_hash, name, role) values
  ('therapist1', 'x', 'Ms Lim', 'therapist'),
  ('student1', 'x', 'Aaron Tan', 'student');

insert into therapists (user_id) select id from users where username = 'therapist1';
insert into students (user_id, date_of_birth, level) select id, '2017-03-01', 'Primary 3' from users where username = 'student1';

insert into therapist_students (therapist_id, student_id)
  select t.user_id, s.user_id from therapists t, students s;

insert into writing_samples (student_id, submitted_by, sample_text, ai_analysis, recommendations, therapist_feedback)
  select s.user_id, t.user_id, 'I go to the shop becos I want to buy bred.',
    '{"errors": [{"text": "becos", "category": "phonological"}]}'::jsonb,
    '[{"title": "Phonics drill", "priority": "high"}]'::jsonb,
    'Good sentence structure, spelling needs work.'
  from students s, therapists t;
```

The `'x'` password hashes above are a deliberate shortcut for direct-SQL
testing — `psql` can't call JS code, so this example is just testing the
schema, not real auth. A hashing utility now exists at
[`server/src/utils/password.ts`](server/src/utils/password.ts)
(`hashPassword`/`verifyPassword`, via `bcryptjs`). Once real signup/login
routes are built, they must call `hashPassword()` before inserting into
`users.password_hash` — never insert a plaintext or placeholder password
outside of schema testing like this.

Full schema and rationale: [`server/src/db/schema.sql`](server/src/db/schema.sql).

### Sharing data with teammates

Each teammate's `docker compose up -d` creates their **own** local, empty
Postgres container — running `docker-compose.yml` gives everyone an identical
*schema*, not shared *data*. There's no shared/hosted database yet; if that's
needed later (e.g. one real dataset everyone's frontend reads from), that's a
separate step (hosted Postgres, or exposing one machine's DB on the network).

## Use case status (DAS DIAL UC1–UC5)

Login, role-based routing (admin/therapist), and an Admin Dashboard now
exist. Status below reflects actual code, not intent — updated as of this
pivot to PS6.

- **UC1 — Assign Students to Educational Therapists: mostly implemented.**
  `AdminDashboard.tsx` creates accounts and assigns therapist↔student via
  `POST /api/admin/users` / `POST /api/admin/assign-therapist`
  (`server/src/routes/admin.ts`, `server/src/db/admin.ts`); therapist views
  are correctly scoped server-side (`getStudentsForTherapist` filters by
  `therapist_id`). Missing: incomplete-profile validation/error state; no
  auth check on admin/therapist routes yet, so "other Therapists cannot
  view" isn't actually enforced server-side; admin-role users never get an
  `admins` table row.
- **UC2 — Submit Student Writing Sample for Analysis: partially
  implemented.** Frontend has a real writing-sample bank
  (`client/public/writing-samples/`, real DAS scans/PDFs + `manifest.json`
  with answer keys) and a working submission flow. `POST /api/analyse` calls
  OpenAI but only takes `{text}` — no student/sample id, so nothing is
  persisted (`writing_samples.ai_analysis`/`therapist_feedback` sit unused).
  Missing: structured error categorisation instead of raw text, persistence,
  and the AI Processing Service (OCR) — image samples currently need the
  therapist to paste transcribed text manually. Already tracked as the next
  backend task in `client/Changes.txt`.
- **UC3 — Generate and Refine Intervention Recommendations: partially
  implemented.** Frontend generates rule-based recommendations from error
  counts with working Accept/Reject buttons. Missing: feedback isn't
  persisted (`writing_samples.recommendations` unused — lost on refresh, so
  it can't refine future recommendations per spec), no LLM re-ranking, and
  rules aren't yet mapped to DAS's SLP Bands A/B/C (materials just received).
- **UC4 — View Student Error Pattern Dashboard: partially implemented.**
  `ErrorPatternDashboard.tsx` shows category/severity breakdowns for the
  single just-run analysis, not historical trends — blocked on UC2's
  persistence. Missing: history endpoint, date/category filters,
  drill-into-session, PDF export.
- **UC5 — Evaluate Intervention Effectiveness and Correlate Error
  Remediation: not started.** Depends on UC2 (persisted history) and UC3
  (persisted, timestamped acceptance) existing first, then: before/after
  error-frequency comparison, effectiveness score, correlation graph,
  minimum-tracking-period warning.

**Highest-leverage next step:** wire `/api/analyse` to accept a student/sample
id and persist structured results to `writing_samples` — UC3, UC4, and UC5
all depend on that data existing.

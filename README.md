# DAS D.I.A.L — 50.003 Project

Prototype for DAS DIAL: PS4 (Error Pattern Analyzer) and PS6 (Intervention
Recommendation Engine). `client/` is the React frontend, `server/` is the
Express + Postgres backend.

## Prerequisites

- Node.js (v18+) and npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Postgres — no local Postgres install needed)

## Setup

1. Install dependencies:

   ```bash
   cd client && npm install
   cd ../server && npm install
   ```
2. Configure environment:

   ```bash
   cp server/.env.example server/.env
   ```

   Fill in `server/.env` (refer to Telegram for shared values):

   | Variable                | Value                                                                           |
   | ----------------------- | ------------------------------------------------------------------------------- |
   | `DATABASE_URL`        | `postgresql://dial:dial@localhost:5432/dial` (matches `docker-compose.yml`) |
   | `PORT`                | `3001`                                                                        |
   | `SEED_ADMIN_PASSWORD` | password for the bootstrap admin account (required, no default)                 |
   | `OPENAI_BASE_URL`     | your OpenAI-compatible endpoint                                                 |
   | `OPENAI_API_KEY`      | your API key                                                                    |
   | `MODEL`               | model name to use for analysis                                                  |

   `server/.env` is gitignored — never commit it.
3. Start Postgres and apply the schema:

   ```bash
   docker compose up -d   # from repo root — starts Postgres 16 in a container
   cd server
   npm run db:apply       # applies server/src/db/schema.sql
   npm run db:seed        # creates the bootstrap admin (username: admin)
   ```

   To wipe and start over: `docker compose down -v && docker compose up -d && npm run db:apply`.
4. Run the app (two terminals):

   ```bash
   cd server && npm run dev   # http://localhost:3001
   cd client && npm run dev   # http://localhost:5173
   ```

   Check the backend + DB are wired up:
   `curl http://localhost:3001/api/health` should return
   `{"status":"ok","db":"connected"}`.

## Testing

Backend (`server/`) and frontend (`client/`) each have their own Jest suite:

```bash
docker compose up -d   # from repo root, if not already running
cd server && npm run db:apply && npm test
cd client && npm test
```

Backend tests hit the real Express app and your local dev Postgres (no mock
DB), creating and cleaning up their own rows, so re-running is safe. Backend
test files live flat in [`server/tests/`](server/tests/); frontend test
files live flat in [`client/tests/`](client/tests/).

### Robustness / fuzz testing

[`server/tests/fuzz.test.ts`](server/tests/fuzz.test.ts) uses
[fast-check](https://fast-check.dev/) for property-based fuzzing and runs
as part of `npm test`. A separate, longer-running HTTP fuzzer
([`server/scripts/fuzz.ts`](server/scripts/fuzz.ts)) targets the DB-backed
routes for extended periods:

```bash
cd server
npm run fuzz                      # quick 30s smoke run
npm run fuzz -- --duration=3600   # longer run (seconds)
npm run fuzz:cleanup              # removes any leftover fuzz-created rows
```

Always run this against your local Docker Postgres, never the deployed
database.

## Deploying

A [`render.yaml`](render.yaml) Blueprint at the repo root provisions all
three pieces on [Render](https://render.com) in one go: the Express API
(`dial-backend`), a managed Postgres (`dial-db`), and the static Vite build
(`dial-frontend`). To deploy:

1. Push this repo to GitHub, then on Render: **New +** → **Blueprint**,
   point it at the repo.
2. Render provisions all three resources from `render.yaml`. Fill in the two
   secrets it prompts for (not stored in the YAML, so they're never
   committed): `OPENAI_API_KEY` (use a fresh key, not your local dev one)
   and `SEED_ADMIN_PASSWORD`.
3. After the first deploy, check the real `dial-backend`/`dial-frontend`
   URLs Render assigned — if they differ from the `render.yaml` placeholders
   (`https://dial-backend.onrender.com` / `https://dial-frontend.onrender.com`),
   update the `CORS_ORIGIN` env var on `dial-backend` and `VITE_API_BASE_URL`
   on `dial-frontend` to match, then redeploy both.
4. Apply the schema and seed the admin account against the live DB — same
   scripts as local setup, just pointed at Render's **External Database
   URL** for `dial-db` (shown in its dashboard) instead of localhost:

   ```bash
   cd server
   DATABASE_URL="<external URL>" DATABASE_SSL=true SEED_ADMIN_PASSWORD="<chosen password>" npm run db:apply
   DATABASE_URL="<external URL>" DATABASE_SSL=true SEED_ADMIN_PASSWORD="<chosen password>" npm run db:seed
   ```
5. Verify: `curl https://<dial-backend-url>/api/health` returns
   `{"status":"ok","db":"connected"}`, then log in on the frontend URL as
   the seeded admin.

Render's free tier idles down and takes ~30-60s to wake on the first
request — fine day-to-day, but worth temporarily bumping `dial-backend`
(and `dial-db` if it's also idle) to the cheapest Starter plan right before
a live demo so there's no cold-start delay in front of an audience. Scale
back down (or delete the services) afterward.

Both `buildCommand`s use `npm install --include=dev` on purpose: Render sets
`NODE_ENV=production` for the build too, and npm treats that as skipping
devDependencies by default — which breaks these builds, since `typescript`,
`ts-node`, and the `@types/*` packages `tsc`/`vite build` need are all
devDependencies. Don't drop `--include=dev` even though it looks redundant.

`CORS_ORIGIN` and `DATABASE_SSL` are the two env vars this setup added
beyond local dev — locally, leave both unset (`server/src/index.ts` and
`server/src/db/index.ts` default to the existing localhost/no-SSL
behaviour).

## Demo data

To populate a running backend (local or deployed) with a small set of
realistic therapist/student accounts, therapist↔student assignments, and
writing samples run through the real analysis + recommendation pipeline:

```bash
cd server
SEED_TARGET_URL=http://localhost:3001 npm run seed:demo             # local
SEED_TARGET_URL=https://dial-backend.onrender.com npm run seed:demo # deployed
```

Talks to the backend over HTTP only — no DB credentials needed. Safe to
re-run: existing `demo-`-prefixed accounts, assignments, and samples are
detected and skipped rather than duplicated. Prints demo login credentials
at the end (same password for every demo account).

## Database reference

### Creating a user with a real hashed password

`npm run db:seed` (from `server/`) hashes a password, inserts the `users`
row plus the matching role-extension row, then verifies the hash round-trip
against Postgres:

```bash
cd server
npm run db:seed -- --username=therapist2 --password=Secret123 --name="Mr Ong" --role=therapist
```

`--role` is one of `admin` / `therapist` / `student` (defaults to `student`
if omitted). Source: [`server/src/db/seed.ts`](server/src/db/seed.ts).

### Raw SQL access

For anything the seed script doesn't cover, connect directly to the local
Postgres container with `psql` (bundled in the Postgres image):

```bash
docker compose exec -T db psql -U dial -d dial              # interactive
docker compose exec -T db psql -U dial -d dial < script.sql # non-interactive
```

Full schema: [`server/src/db/schema.sql`](server/src/db/schema.sql). Any
manually-inserted `password_hash` must go through
[`hashPassword()`](server/src/utils/password.ts) — never insert a plaintext
or placeholder password outside of one-off schema testing.

### Sharing data with teammates

Each teammate's `docker compose up -d` creates their **own** local, empty
Postgres container — everyone gets an identical *schema*, not shared
*data*. Use the deployed Render database (see "Deploying") or `seed:demo`
if you need a shared dataset.

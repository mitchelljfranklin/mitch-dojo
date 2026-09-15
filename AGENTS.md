# AGENTS.md

Operating guide for any agent or developer working in this repository.

## Project

**Mitch‑Dojo** — an open-source (AGPL-3.0), self-hosted, single-dojo management
platform for martial arts schools: students, classes/schedule, attendance &
QR check-in, belts & gradings, memberships & payments (manual recording first,
gateways later), communication, and retention analytics.

Design principle: **simple and easy to manage**. Prefer fewer, well-connected
screens over sprawling configuration. Do not add features that are not in the
plan without asking.

## Stack

- **Next.js (App Router) + TypeScript strict** — full-stack (Server Components
  + Server Actions / Route Handlers)
- **PostgreSQL + Prisma 7** — relational data + typed ORM + migrations.
  **One schema, one migration set.** Two connection modes:
  - `DATABASE_PROVIDER=postgres` → official `@prisma/adapter-pg` over
    `DATABASE_URL` (server mode; default)
  - `DATABASE_PROVIDER=pglite` → embedded PostgreSQL (PGlite) at
    `DATABASE_DIR` (lite mode). PGlite runs real Postgres semantics (enums,
    Json, scalar arrays all work) so **the schema never forks**. Migrations in
    lite mode are applied by `scripts/migrate-pglite.mjs` (the community
    adapter cannot run `prisma migrate deploy` yet); the migration SQL files
    are the canonical shared DDL.
- **Auth.js (NextAuth v5)** — staff auth, JWT sessions, credentials provider
  (SSO providers land in a later phase)
- **Tailwind CSS v4 + shadcn/ui** — UI; themed via CSS-variable design tokens
  (light + dark)
- **Nodemailer over SMTP** — provider-agnostic email; **React Email** templates
- **@react-pdf/renderer** — PDF reports (later phase)
- **Local-disk volume** — file storage behind a storage interface
  (`lib/storage/`; S3 and Azure Blob swappable in-app); files served only via
  authenticated routes
- **Built-in scheduler (default) → `lib/scheduler.ts` via `instrumentation.ts`**
  — every 5 minutes: audit/email-log pruning, reset-token pruning, orphaned-file
  sweep. Toggle in Settings → Operations; external trigger via secured
  `/api/cron/run`
- **Docker Compose** (app + Postgres = `docker-compose.yml`; single container
  embedded = `docker-compose.lite.yml`), reverse proxy (Caddy/nginx) for TLS

## Repository layout

```
app/                 # Next.js App Router
  (internal)/        # authenticated dashboard
    dashboard/       #   landing page
    profile/         #   own profile
    settings/        #   organization, appearance, operations, storage, email,
                     #   health, users, roles, audit log
  (auth)/            # login, first-run setup, forgot/reset password
  api/               # auth, health, cron trigger, csp-report, brand logo
  style-guide/       # component showcase
components/          # shadcn ui primitives + domain composites
  ui/                # button, card, dialog, table, tabs, sidebar, etc.
hooks/               # use-form-toast, use-action-feedback, use-mobile
lib/                 # cross-cutting logic
  actions/           # server actions (auth, profile, roles, users)
  cron/              # scheduled jobs (run-jobs.ts)
  db/                # typed data-access layer (audit, roles, users)
  email/             # Nodemailer mailer + token replacer
  schemas/           # shared zod schemas + inferred types
  settings/          # DB-backed operational config (schema, accessor)
  storage/           # file storage interface (local, s3, azure, orphan-sweep)
  api-keys.ts (later) # permissions.ts, auth.ts, env.ts, prisma.ts, tokens.ts,
                      # rate-limit.ts, timing-safe.ts, session.ts, client-ip.ts,
                      # crypto.ts, nav.ts, utils.ts, theme-tokens.tsx
emails/              # React Email template (dynamic.tsx)
prisma/              # schema.prisma, migrations, seed.ts, seed-runner.cjs
scripts/             # migrate-pglite.mjs, prepare-standalone.mjs, backup.*
e2e/                 # Playwright end-to-end tests
docs/                # VitePress-powered user documentation site
proxy.ts             # Next.js 16 proxy (CSP nonce + security headers)
```

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (must pass before any gate sign-off)
- `npm run lint` / `npm run typecheck` / `npm run format:check` — quality gates
- `npm run precheck` — typecheck + lint + format:check in sequence
- `npm run test` — Vitest. Integration tests refuse to run unless pointed at a
  test database (`TEST_DATABASE_URL`, name must contain `test`).
- `npm run test:e2e` — Playwright (runs against the production build; requires
  `DATABASE_URL` pointing at a `*test*` database; `reuseExistingServer` off —
  kill anything on :3000 first)
- `npm run db:migrate` / `db:deploy` / `db:deploy:lite` / `db:seed`
- `docker compose up` — app + Postgres; `docker compose -f docker-compose.lite.yml up`

### Verification gotchas (inherited from mitch-risk — still apply)

- **e2e runs against the production build** (`npm run build` output), needs
  `CRON_SECRET`, and refuses non-test databases.
- **New permission keys converge to existing databases only when the seed
  runs** (`npm run db:seed` or `ensureSystemRoles()`).
- **Apply new Prisma migrations to both dev and test databases** before
  running integration tests.
- **Never point `TEST_DATABASE_URL` at the dev/prod database.**
- **CI runs typecheck + lint + format:check + build on every push** —
  `npm run format` before pushing; Prettier failures are the top CI rejection.
- **Server Actions that feed `useActionState` must NOT call `revalidatePath`**
  (Node >= 23 aborts the response streaming). Let the client refresh via
  `useActionFeedback`. Actions also called from API/cron contexts may
  `revalidatePath`.
- **PowerShell string pipelines corrupt non-ASCII characters** — never
  round-trip file text through `Get-Content`/`Set-Content`; use
  `[IO.File]::ReadAllText`/`WriteAllText` with explicit UTF-8.
- **Quote bracketed dynamic-route paths** for Prettier/Node; `Select-String
  -Path` treats `[...]` as a wildcard — use `-LiteralPath`.
- **Never run schema-less UPDATE/DELETE against a database — ever.**

### PGlite-mode gotchas

- **PGlite is single-process.** Before any command that opens the data
  directory (`npm run db:deploy:lite`, `db:seed`, or a manual PGlite script),
  verify no dev server is running on :3000 — a second process opening the
  same `DATABASE_DIR` aborts the running instance (WASM `Aborted()` → every
  DB-touching page 500s) and can corrupt the directory on disk. Recovery:
  move the corrupted dir aside, then `db:deploy:lite` + `db:seed` fresh.
  **Enforced mechanically:** `db:deploy:lite` and the lite seed probe
  :3000 first (`scripts/pglite-guard.mjs`) and refuse to open the data
  directory while something is serving.
- `prisma migrate dev/deploy` cannot drive PGlite. **Author migrations
  against Postgres** (docker), consume them in lite mode via
  `scripts/migrate-pglite.mjs` (`npm run db:deploy:lite`).
- `lib/prisma.ts` and `prisma/seed.ts` both branch on `DATABASE_PROVIDER`;
  keep the two bootstrap paths in sync when adding adapter options.
- PGlite processes queries serially (single connection) — fine for a single
  dojo; do not add parallel-heavy raw SQL without re-checking.
- PGlite's WASM/ESM assets must stay externalised in the Next standalone
  build (`serverExternalPackages` in `next.config.ts`) or the Docker runtime
  cannot resolve them.
- The lite CI job runs `migrate-pglite.mjs` twice and seeds twice to prove
  idempotency — keep it that way.

## Definition of Done — no placeholders

- **Wired end-to-end.** UI ↔ Server Action/Route Handler ↔ Prisma ↔ database.
  No hardcoded/mock arrays standing in for the database.
- **No stubs.** No TODO/FIXME, no empty function bodies, no dead code.
- **Quality gates pass.** `npm run lint`, `npm run typecheck`,
  `npm run format:check`, `npm run build`.
- **Tested.** Every new function ships with tests in the same change.
- **Access-controlled.** Every feature wired into RBAC: permission keys in
  `lib/permissions.ts`, mapped into `SYSTEM_ROLE_DEFINITIONS`, enforced with
  `requirePermission` on every server action/route/page, and **hidden (not
  greyed-out)** in the UI when the user lacks the permission.
- **Migrations clean.** Migrations apply on a fresh database in **both**
  modes (Postgres + PGlite runner); seeds are idempotent.
- **Dual-mode safe.** Schema changes must not break either connection mode.

## Reusability & DRY

- **Styling = tokens only.** No hardcoded hex colours/spacing; extend shadcn
  primitives via `cva` + `cn`.
- **One home per concern.** UI primitives `components/ui/`; composites
  `components/`; cross-cutting logic `lib/`; shared zod schemas
  `lib/schemas/`.
- **No copy-paste.** Reused Prisma queries live in `lib/db/`.
- **Reuse before create.** Search for an existing token/component/helper
  first.

## Code readability & best practices

- **Full, descriptive names** — `student`, not `stu`; `calculateBeltEligibility`,
  not `calcBelt`. No single-letter variables (except `i`, `j` loop indices).
- **Small, single-responsibility units.** Guard clauses; early returns.
- **No magic values.** Named constants/enums for statuses.
- **Explicit types at boundaries.** No `any` (`unknown` + narrowing); validate
  all external input with zod.
- **No comments unless requested**; when requested, explain *why*.
- **Code should look human-written.** Prefer clarity over cleverness; one
  thought per line; straightforward control flow; specific errors; pass the
  "read aloud" test. Avoid `reduce` for mutation, boolean-trap parameters,
  `.forEach()` needing `break`, mutation of parameters, single-letter
  variables, dense one-liners.
- Prefer Server Components for reads and Server Actions for writes.

## Conventions

- TypeScript `strict`; zod-validate all external input (shared client/server
  schemas in `lib/schemas/`).
- **Runtime configuration** (branding, SMTP, rate limits, retention, storage,
  users, roles) is managed in-app via DB-backed Settings — never by editing
  files once deployed. Only deployment bootstrap/infra belongs in env.
- Secrets in env or encrypted at rest in Settings (`APP_ENCRYPTION_KEY`);
  never returned to the client; never committed.
- **Data lifecycle.** Deleting a record removes associated storage files; the
  cron orphan sweep is the backstop. **Every storage writer must be reflected
  in the sweep's referenced-key set** (`lib/cron/run-jobs.ts` collects the
  brand logo, student photo keys, and attachment storage keys) — new key
  formats without registration there get deleted within an hour. Deleting a
  user preserves audit history via nullable `SetNull` relations ("Deleted
  user") — never cascade-delete audit trails. Deleting a student removes
  their photo + attachments.
- **Multi-location semantics.** The tenant is the school; `Location` rows are
  its dojo sites. Locations are organisational only (no per-location access
  scoping). Students may train at several locations with exactly one primary
  (`StudentLocation.isPrimary` — enforced in `lib/db/students.ts`). Every
  class belongs to exactly one location (Phase 2+). Never hard-delete a
  location that has students — deactivate it.
- **Audit-log discipline.** Every state-changing admin action logs via
  `logAudit`/`logAuditSafe` with an action from `AUDIT_ACTIONS`.
- Keep file text UTF-8; never introduce cp1252 mojibake.

## Security & deployment invariants

- **CSP lives in `proxy.ts`** (Next 16 replacement for `middleware.ts`):
  nonce-based, `strict-dynamic`, applied only to document GET requests; never
  rewrite headers on Server-Action POST/RSC requests; no
  `upgrade-insecure-requests`; new external origins must be added to the
  relevant directive.
- **Compare secrets in constant time** (`lib/timing-safe.ts`, e.g.
  `CRON_SECRET`). Rate limiting is in-memory/per-process — correct for the
  single-container deployment.
- **Deployment env musts:** `CRON_SECRET` required in production;
  `TRUSTED_PROXY_COUNT` must match the real proxy hop count (default 0).
- **PGlite data directory** (`DATABASE_DIR`) must be a mounted volume in lite
  mode — backups are stop-copy-start of that directory.

## Windows / PowerShell tooling notes

- Quote bracketed paths (`"app/api/auth/[...nextauth]/route.ts"`); use
  `-LiteralPath` for anything with `[]`.
- Never round-trip file text through PowerShell string ops (UTF-8 → cp1252
  mojibake); if a scripted edit is unavoidable, use
  `[IO.File]::ReadAllText`/`WriteAllText` with explicit UTF-8.
- `robocopy` handles wildcard-hostile paths (e.g. `[...nextauth]`) that
  `Copy-Item`'s wildcard engine mangles.

## Working in batches

Work proceeds in **review-gated phases** (see README/ARCHITECTURE for the
roadmap). Rules:

1. Work one phase at a time, in order. Do not start a new phase until the
   previous one has been reviewed.
2. When a phase's work is done, run the verification commands and present the
   changes for review. Then stop and ask for sign-off.
3. Keep this file accurate as reality changes.

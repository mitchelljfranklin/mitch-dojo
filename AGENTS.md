# AGENTS.md

Operating guide for any agent or developer working in this repository.

## Project

**Mitch‑Dojo** — an open-source (AGPL-3.0), self-hosted, single-dojo management
platform for martial arts schools: students, classes/schedule, attendance &
QR check-in, belts & gradings, memberships & payments (manual recording first,
gateways later), communication, trials & leads, member portal, compliance
(medical PHI + versioned agreements with digital signing), and retention
analytics.

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
  + SSO (Microsoft Entra ID / Google / generic OIDC with break-glass URL)
- **Tailwind CSS v4 + shadcn/ui** — UI; themed via CSS-variable design tokens
  (light + dark)
- **next-intl** — cookie-based locale (`NEXT_LOCALE`), English default with
  English, Spanish, Portuguese, French, German, Italian, Japanese, Korean,
  Chinese, Arabic, Hindi, and Russian catalogs; the school default is
  configurable in Admin → General. The ten added languages are initial
  machine-assisted translations pending native review.
  Catalogs live in `messages/`, resolution in `lib/i18n/`. Translated
  surfaces: public booking, member portal, QR check-in, auth screens, the
  staff shell/dashboard, the full Students domain (list, form, detail,
  households, CSV import), Classes (courses + weekly schedule), Attendance
  (browser, session sheets, backfill, CSV import), Belts (disciplines,
  ladder, progression, promotions, gradings, CSV import), Memberships (plans,
  enrollment import), Invoices (list, detail, payments), Trials (pipeline,
  conversion), Trainers (roster, verifications), Compliance (outstanding
  agreements), Incidents (accident book, reports), Analytics (overview,
  charts), Reports (attendance, celebrations, revenue), Profile
  (account, password), and Admin (General, Appearance, Storage, Locations,
  Users, Roles, Memberships settings, Communication, Documents, Verifications,
  Email/SMTP, Templates, Campaigns, Email log, Audit log, Health, Scheduling,
  Sign-in/SSO). Outbound email shells follow the school default language;
  generated PDFs follow the viewer's locale (non-Latin scripts fall back to
  English labels until fonts are embedded); admin-authored email templates and
  document text stay as written. Adding a language:
  `docs/advanced/adding-a-language.md`.
- **Nodemailer over SMTP** — provider-agnostic email; **React Email** templates
- **@react-pdf/renderer** — branded PDFs (invoices, student report cards,
  attendance sheets, printable agreements)
- **Local-disk volume** — file storage behind a storage interface
  (`lib/storage/`; S3 and Azure Blob swappable in-app); files served only via
  authenticated routes
- **Built-in scheduler (default) → `lib/scheduler.ts` via `instrumentation.ts`**
  — every 5 minutes runs `lib/cron/run-jobs.ts`: session + recurring-invoice
  generation, hold auto-resume, reminder emails (class/payment/birthday/trial/
  agreement/verification), campaign drain, log + token pruning, orphaned-file
  sweep. Toggle in Admin → Scheduling; external trigger via secured
  `/api/cron/run`
- **Docker Compose** (app + Postgres = `docker-compose.yml`; single container
  embedded = `docker-compose.lite.yml`), reverse proxy (Caddy/nginx) for TLS

## Repository layout

```
app/                 # Next.js App Router
  (internal)/        # authenticated dashboard: dashboard, students (with
                     #   households/, import/, [studentId]/), classes, sessions,
                     #   attendance, belts, memberships, trials, trainers,
                     #   analytics, reports, compliance, incidents, profile,
                     #   settings (compat shim for /admin)
    admin/           # the Admin area — 18 sections in 7 groups; section
                     #   list, grouping, and per-section permission come from
                     #   lib/admin-nav.ts (source of truth for sidebar + guards)
  (auth)/            # login (+ SSO buttons, break glass), first-run setup,
                     #   forgot/reset password
  book/              # public trial-booking page (for-yourself or child)
  checkin/[token]/   # public QR check-in (kiosk mode)
  portal/            # read-only member portal + document signing
  api/               # auth, health, cron trigger, csp-report, brand logo,
                     #   student photo/export, invoice/report-card/attendance/
                     #   agreement PDFs, session check-in QR, report CSVs,
                     #   attachments, trainer verification docs
  style-guide/       # component showcase
components/
  ui/                # shadcn/ui primitives; domain composites sit flat in components/
hooks/               # use-form-toast, use-action-feedback, use-mobile
lib/                 # cross-cutting logic
  actions/           # server actions
  db/                # typed data-access layer (colocated *.integration.test.ts)
  cron/              # scheduled jobs (run-jobs.ts, reminders.ts)
  email/             # Nodemailer mailer + staff booking alert
  pdf/               # @react-pdf/renderer docs (invoice, report card,
                     #   attendance sheet, agreement) + branded shell
  schemas/           # shared zod schemas + inferred types
  settings/          # DB-backed operational config (schema, accessor)
  storage/           # file storage interface (local, s3, azure, orphan-sweep)
                     # plus permissions.ts, auth.ts, env.ts, prisma.ts,
                     #   scheduler.ts, nav.ts, admin-nav.ts, break-glass.ts,
                     #   timing-safe.ts, rate-limit.ts, ...
emails/              # React Email template (dynamic.tsx)
prisma/              # schema.prisma, migrations/ (canonical DDL), seed.ts,
                     #   seed-runner.cjs; generated/ (gitignored Prisma client)
scripts/             # migrate-pglite.mjs, pglite-guard|safety|probe.mjs,
                     #   docker-entrypoint.sh, prepare-standalone.mjs,
                     #   bump-version.mjs, docs-sweep-admin.mjs
e2e/                 # Playwright specs (chromium suite + sso-serial project)
docs/                # VitePress user documentation site
proxy.ts             # Next.js 16 proxy (CSP nonce + security headers)
```

## Commands

- `npm run dev` — local dev server (Node >= 22; `.nvmrc` pins 22)
- `npm run build` — production build (must pass before any gate sign-off);
  also copies `static`/`public` into `.next/standalone`
  (`scripts/prepare-standalone.mjs`) so `npm run start` and e2e hydrate
- `npm run lint` / `npm run typecheck` / `npm run format:check` — quality gates
- `npm run precheck` — typecheck + lint + format:check in sequence
- `npm run test` — Vitest. `*.integration.test.ts` suites skip themselves
  unless `TEST_DATABASE_URL` is set (a bare `npm run test` = unit tests only);
  when set, the URL must contain `test`. One file:
  `npx vitest run lib/db/students.integration.test.ts`. Vitest runs files
  **sequentially** (`fileParallelism: false` — they share one database).
- `npm run test:e2e` — Playwright against the built app (`reuseExistingServer`
  off — kill anything on :3000). Needs a fresh `npm run build` and
  `DATABASE_URL` pointing at a `*test*` database (specs mutate/reset it). The
  `sso-serial` project runs after the main chromium suite.
- `npm run db:generate` — regenerate the Prisma client. Required after editing
  `prisma/schema.prisma`; the client is generated to `prisma/generated/`
  (gitignored) and `typecheck`/`build` fail if it is stale.
- `npm run db:migrate` / `db:deploy` / `db:deploy:lite` / `db:seed`
- `npm run bump -- X.Y.Z` — single command updates all 4 version spots
  (package.json, lockfile ×2, Dockerfile build-info, lib/build-info.ts
  fallback, ARCHITECTURE.md header). Transform-then-write with per-spot
  verification, explicit UTF-8 no-BOM writers, abort-on-mismatch.
- `npm run docs:build` — build the VitePress site; fails on dead links
- `docker compose up` — app + Postgres; `docker compose -f docker-compose.lite.yml up`

### Verification gotchas (inherited from mitch-risk — still apply)

- **e2e runs against the production build** (`npm run build` output), needs
  `CRON_SECRET`, and refuses non-test databases.
- **New permission keys converge automatically at server boot**
  (`convergeSystemRolePermissions()` in `instrumentation.ts` grants any
  missing code-defined permissions to the seeded system roles, without
  revoking custom grants). A full reseed (`npm run db:seed` /
  `ensureSystemRoles()`) still resets the system roles strictly.
- **Apply new Prisma migrations to both dev and test databases** before
  running integration tests.
- **The Prisma client lives at `prisma/generated/prisma`** (`generator client`
  uses `provider = "prisma-client"` with a custom `output`; `lib/prisma.ts`
  imports from there, not `@prisma/client`). It is gitignored — run
  `npm run db:generate` after each schema change or `typecheck`/`build` fail
  on a stale/missing client.
- **Never edit an applied migration — always add a new one.** Editing a
  shipped migration file breaks the checksum ledger (Postgres demands a
  reset; the lite runner warns). If a migration needs correcting, create a
  follow-up migration.
- **Never point `TEST_DATABASE_URL` at the dev/prod database.**
- **CI runs typecheck + lint + format:check + build on every push** —
  `npm run format` before pushing; Prettier failures are the top CI rejection.
  `.prettierignore` excludes `*.md` and `docs/`, so `format:check` does **not**
  cover markdown or the docs site.
- **Container boot = migrate → seed once → serve** (`scripts/docker-entrypoint.sh`;
  the seed marker is `/app/.storage/.seeded`, `SKIP_SEED=true` skips it). The
  PGlite path runs `migrate-pglite.mjs` instead of `prisma migrate deploy`.
- **Release flow:** CI (`.github/workflows/ci.yml`) runs on pushes/PRs to
  `master`. Pushing a `v*` tag publishes the GHCR image
  (`docker-publish.yml`); `docs.yml` is manual-only until the repo is public.
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
- **Never open the data dir with an ad-hoc inline script** (`node -e` probes,
  quick queries) while a dev server might be running — the guard only
  protects `db:deploy:lite`/`db:seed`, not hand-rolled scripts. Dual-open
  can corrupt the dir **and every retained backup**, leaving a full rebuild
  (fresh dir → migrate → seed, dev data lost) as the only recovery. Use
  `scripts/pglite-probe.mjs` with :3000 confirmed free, and keep it
  read-only.
- **When a migration ships, apply it to the PGlite dev database in the same
  delivery** (`db:deploy:lite` + `db:seed` while :3000 is free) — running
  only `prisma migrate deploy` against the Docker Postgres databases leaves
  the dev PGlite schema behind (every new page 500s with "table does not
  exist").
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
- `lib/prisma.ts` dedupes the client on `globalThis` unconditionally — keep it.
  The standalone build duplicates `lib/prisma` across module graphs; a second
  client over one PGlite data dir means split state and on-disk corruption.
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
- **Documentation current.** Every user-visible change updates the affected
  docs in the same change (see "Documentation" under Conventions). Stale
  docs are treated as bugs — same bar as failing tests.

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
  Translation helpers follow the same rule: `translate`, `translateStatus`,
  `translateDetail`, never `t`/`d`. Resolved `searchParams` are named `query`,
  not `sp`, and the next-intl formatter is `formatter`, not `format`.
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
- **Documentation.** All `.md` files and the VitePress site (`docs/`) are
  part of the product and must never go stale. In the same change that
  alters behaviour, update every affected doc:
  - **VitePress site (`docs/`)** — user/operator-facing. Feature changes
    touch the relevant User Guide; settings/label changes touch the
    matching Configuration page; deployment/infra changes touch
    Deployment/Advanced. New pages must be added to the sidebar in
    `docs/.vitepress/config.ts`. Verify with `npm run docs:build`
    (dead-link checked) before committing.
  - **Repo-level docs** — `README.md` (feature/status claims, commands),
    `ARCHITECTURE.md` (roadmap table, data model, design decisions,
    `> **Version:**` header via `npm run bump`), `phasereview.md`
    (remaining-work checklist — tick items off when done).
  - **`AGENTS.md` itself** — keep accurate as reality changes (this file's
    own rule, under Working in batches).
  - Scan for staleness when touching a domain: grep the docs for old
    feature/section/route names and fix every hit, not just the nearest
    page. Screenshots: `docs/welcome/screenshots.md` lists what to capture.
- **Runtime configuration** (branding, SMTP, rate limits, retention, storage,
  users, roles) is managed in-app via DB-backed Settings — never by editing
  files once deployed. Only deployment bootstrap/infra belongs in env.
- Secrets in env or encrypted at rest in Settings (`APP_ENCRYPTION_KEY`);
  never returned to the client; never committed.
- **Data lifecycle.** Deleting a record removes associated storage files; the
  cron orphan sweep is the backstop. **Every storage writer must be reflected
  in the sweep's referenced-key set** (`lib/cron/run-jobs.ts` collects the
  light + dark brand logos, student photo keys, attachment storage keys, and
  trainer-verification document keys) — a new key format without registration
  there is deleted within an hour. Deleting a user preserves audit history via
  nullable `SetNull` relations ("Deleted user") — never cascade-delete audit
  trails. Deleting a student removes their photo + attachments.
- **Multi-location semantics.** The tenant is the school; `Location` rows are
  its dojo sites. Locations are organisational only (no per-location access
  scoping). Students may train at several locations with exactly one primary
  (`StudentLocation.isPrimary` — enforced in `lib/db/students.ts`). Every
  class belongs to exactly one location (Phase 2+). Never hard-delete a
  location that has students — deactivate it.
- **Audit-log discipline.** Every state-changing admin action logs via
  `logAudit`/`logAuditSafe` with an action from `AUDIT_ACTIONS`.
- **Form UX conventions.** Forms use uncontrolled inputs (they only read
  defaults at mount), so every write path must have a story for how the UI
  reflects the saved state:
  - **State-fed actions** (`useActionState`, `previousState` param) must NOT
    call `revalidatePath` (Node >= 23 aborts the response — the DB write
    persists but the client gets no toast, no refresh, stale inputs). The
    client refreshes via `useActionFeedback` (Sonner toast +
    `router.refresh()`).
  - **Page-level forms** (student, course, profile, settings forms): wrap in
    a thin wrapper that keys the inner form on a JSON fingerprint of the
    data props (`<Inner key={JSON.stringify([values, ...])} {...props} />`).
    A refresh with changed data remounts and shows saved/normalized values;
    a failed save never triggers a refresh, so in-progress edits survive.
    Never key on the action state — the remount would race the refresh.
  - **Sheets** (stay-open + Done pattern): key the form on the open state
    (`key={open ? "open" : "closed"}`) so reopening picks up fresh data.
  - **Plain form actions** (delete, toggle, void — no `previousState`):
    `revalidatePath` is allowed and expected.
  - **Create flows that navigate** (e.g. create student/course): end the
    action with `redirect(...)`; the target page shows a `FlashToast` from a
    search param (`?created=1`). FlashToast is for post-redirect feedback;
    Sonner toasts are for stay-on-page saves.
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
- **Deployment env musts:** `CRON_SECRET` required in production (>= 32
  chars); `TRUSTED_PROXY_COUNT` must match the real proxy hop count (default
  0); set `TZ` to the dojo's IANA zone — calendar-day logic (check-in,
  reminders, analytics, session generation) keys off server local time and
  silently runs UTC without it.
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

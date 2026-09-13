# Mitch‑Dojo — Architecture Solution Design Document

> **Version:** 0.1.0 (Phase 0)
> **Last Updated:** September 2026
> **Audience:** Engineering, Security, Operations
> **Status:** Approved

---

## 1. Executive Summary

**Mitch‑Dojo** is an open-source (AGPL-3.0), self-hosted, single-dojo
management platform for martial arts schools. It is designed around three
principles:

- **Simple and easy to manage** — fewer, well-connected screens; everything
  configurable in-app
- **Self-contained** — single Docker Compose stack (or a single container in
  lite mode)
- **Security-first** — CSP nonce, bcrypt, AES-256-GCM secrets, RBAC on every
  action

## 2. Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffold: auth, RBAC, settings, audit, scheduler, storage, email, dual-mode DB, Docker, CI, docs | Done |
| 1 | **Students & locations**: Location CRUD + student↔location assignment (multi-location, primary/home dojo), student CRUD, search, CSV import/export, photo + attachments | Done |
| 2 | **Classes & schedule**: Trainer roster (optional User account link), courses (required locationId — one location per class), recurring weekly training times, generated sessions, weekly timetable view | Done |
| 3 | **Attendance & QR check-in**: session attendance sheets (Present/Late/Excused/Absent), bulk mark-all, public per-location QR check-in pages (no-login, revocable token), student attendance history | Done |
| 4 | **Belts & gradings**: per-course belt levels (colour + order + required trainings), student promotion history (denormalised), cumulative attendance-based eligibility with instructor override, standard belt range in Settings | Done |
| 5 | **Historical attendance & belt-history import**: per-student backfill sheet, attendance CSV import (creates missing past sessions, idempotent), belt-history CSV import (belts must exist first) | **Current** |
| 6 | Memberships & payments: plan builder, enrollments, invoices + manual payments, overdue tracking | Planned |
| 7 | Communication: templates, reminders (class/payment/birthday) via scheduler | Planned |
| 8 | Analytics: active members, attendance trends, retention signals, revenue summary — per-location breakdowns | Planned |
| 9 | Trials & leads: trial pipeline, conversion tracking, public booking page | Planned |
| 10 | Member portal: self-service schedule/check-in/details | Planned |
| 11+ | Stripe/SEPA/PayPal, white-label, REST API + Swagger | Planned |

Out of scope (explicitly): SMS/WhatsApp marketing, funnel/landing-page
builders, POS storefront, project management, kiosk apps, native mobile apps.

## Multi-location model

The tenant is the **school** (e.g. "Hino Tori Karate"); `Location` rows are
its **dojo sites**. Semantics locked in at Phase 1:

- **Locations are organisational, not an access boundary.** All staff see all
  locations; locations exist to filter views and group data. Per-location
  access isolation is explicitly out of scope.
- **Students train at one or more locations** (`StudentLocation` M:N), with a
  designated **primary (home) dojo** (`isPrimary` — exactly one per student,
  enforced in the data layer) used for reporting and, later, eligibility.
- **Every class belongs to exactly one location** (Phase 2: required
  `locationId` on `Course`/`TrainingTime`).
- Deletion safety: a location with assigned students cannot be deleted —
  deactivate it instead; hard delete only when unreferenced.

## 3. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | >= 22 | Application runtime |
| Framework | Next.js | 16 (App Router) | Full-stack server + client |
| Language | TypeScript | ^6 (strict) | Type safety |
| Database | PostgreSQL | 17 (or embedded via PGlite) | Relational persistence |
| ORM | Prisma | ^7 | Typed DB access + migrations |
| Auth | Auth.js (NextAuth v5) | ^5 | JWT sessions, credentials provider |
| UI | Tailwind CSS 4 + shadcn/ui | — | Design tokens, accessible primitives |
| Charts | recharts | ^3 | Dashboards (later phase) |
| Email | Nodemailer + React Email | — | SMTP delivery, templates |
| PDF | @react-pdf/renderer | ^4 | Reports (later phase) |
| Tests | Vitest + Playwright | — | Unit/integration + e2e |
| Deploy | Docker Compose | — | Self-hosted app (+ DB) |

## 4. Dual-mode database (the defining infrastructure decision)

One schema, one migration set, two connection modes:

```
DATABASE_PROVIDER=postgres
  └─ @prisma/adapter-pg → DATABASE_URL (PostgreSQL 17 server)
                          prisma migrate deploy manages schema

DATABASE_PROVIDER=pglite
  └─ @electric-sql/pglite (embedded Postgres WASM) at DATABASE_DIR
     via pglite-prisma-adapter
     scripts/migrate-pglite.mjs applies the same prisma/migrations/*.sql
     with a checksum ledger table (_mitch_dojo_migrations)
```

Why: PGlite runs **real Postgres semantics** (enums, Json, scalar arrays), so
the schema and DDL never fork between modes. The deployment choice becomes a
single environment variable. Constraints and mitigations:

| Constraint | Mitigation |
|---|---|
| `prisma migrate dev/deploy` cannot drive PGlite | Author migrations against docker Postgres; consume via `scripts/migrate-pglite.mjs` |
| Single connection, serialized queries | Acceptable for a single dojo; no parallel-heavy raw SQL |
| No TCP access to the DB in lite mode | pgAdmin/BI tools unavailable; backups are stop-copy-start of `DATABASE_DIR` |
| Community adapter maturity | Pin versions; CI runs the lite path twice to prove idempotency |
| WASM asset resolution in the standalone build | `serverExternalPackages` externalises PGlite in `next.config.ts` |

## 5. Data Model (Phases 0–1)

```
Role ──< User ──< AuditLog
              ├─< PasswordResetToken
              └─< NotificationLog (sentBy, SetNull)
              └── Trainer (0..1 link) ──< Course ──< TrainingTime
                                            └──< ClassSession >── Location

AppSetting (category/key/value Json/isSecret)  — all runtime config

Location ──< StudentLocation >── Student
Location ──< Course ──< TrainingTime (weekly recurring slot)
Location ──< ClassSession ──< Attendance >── Student
Course ──< BeltLevel ──< StudentBelt >── Student (history; belt name/colour denormalised)
Student (photoKey, status TRIAL/ACTIVE/INACTIVE/ALUMNI, guardian, emergency contact)
Attachment (polymorphic entityType/entityId — "Student" documents)
```

Belt eligibility (`getCourseProgress`, cumulative): a student's trainings on
a course = count of ALL Present/Late attendance on that course's sessions,
from their very first class. A belt's `requiredTrainings` is the cumulative
total needed to be awarded that belt (0 for the entry rank) — e.g. Black at
300 means a student training twice a week reaches it around the 3-year mark,
and each belt's threshold is set once in Settings rather than recomputed as
"what's left" per rank. Eligibility is surfaced as a badge; recording a
promotion requires the threshold unless the instructor ticks Override
(make-up gradings, exceptional progression). Belt levels that have been
awarded cannot be deleted; history rows denormalise name/colour so they stay
readable through reorganisations.

`ClassSession` rows are generated by `ensureUpcomingSessions()` for the next
14 days whenever the schedule or a course page is viewed; the
`(courseId, date, startTime)` unique constraint makes generation idempotent.
Session `locationId` is a copy taken at generation time so attendance history
survives a course later moving locations. Cancelling a session flips its
`SessionStatus` to `CANCELLED` (kept, not deleted).

Attendance: one `Attendance` row per (session, student) with status
`PRESENT/LATE/EXCUSED/ABSENT` and `source` `MANUAL` or `CHECKIN` (a staff
overwrite keeps the manual source). The public check-in flow records
`PRESENT` with source `CHECKIN`; staff saves overwrite status but the source
becomes MANUAL. `TRAINED_STATUSES` = Present + Late — the basis for later
retention analytics and belt eligibility.

Key relationships follow mitch-risk conventions: user deletion preserves
history via `SetNull` ("Deleted user"); delete cascades are explicit and
per-model. Deleting a student removes their photo and attachments from
storage; the orphan sweep collects `students.photoKey`, `attachments.storageKey`,
and the brand logo as referenced keys.

## 5.1 Identity & Access

- **Auth.js v5**, JWT sessions, sliding-window expiry
  (`operations.sessionTimeoutMinutes`, default 30).
- **Credentials provider** — bcrypt (12 rounds), rate-limited per IP.
- **RBAC:** permission catalog in `lib/permissions.ts` (students, classes,
  attendance, belts, memberships, communications, administration, profile),
  three seeded system roles (**Admin** — all keys, **Trainer** — floor
  operations, **Viewer** — read-only). Custom roles via Settings → Roles.
- Every server action/route/page enforces `requirePermission`; the UI hides
  gated controls entirely.

## 6. Settings & Configuration

DB-backed (`AppSetting`, zod-validated per category in `lib/settings/`):
organization, appearance (logo/colours/radius/page width), operations (login
throttle, session timeout, retention, scheduler toggle), files, storage
(local/S3/Azure), email (SMTP; password AES-256-GCM encrypted at rest), email
templates. Only deployment bootstrap belongs in env (`DATABASE_URL`/`DIR`,
`AUTH_SECRET`, `APP_ENCRYPTION_KEY`, `APP_URL`, `CRON_SECRET`,
`DATA_STORAGE_PATH`, `TRUSTED_PROXY_COUNT`).

## 7. Background Jobs

`lib/scheduler.ts` (started by `instrumentation.ts`, Node runtime only, every
5 minutes) executes `lib/cron/run-jobs.ts`: audit-log pruning, password-reset
token pruning, email-log pruning, and the orphaned-file sweep. The sweep's
referenced-key set is the storage-writer contract: any new storage key format
must be registered there. External trigger: `GET /api/cron/run` with
`x-cron-secret` (constant-time compare, rate-limited).

## 8. Security Architecture

- **CSP in `proxy.ts`** — nonce-based, `strict-dynamic`, document GETs only;
  never rewrites headers on Server-Action POST/RSC requests; no
  `upgrade-insecure-requests`; HSTS delegated to the reverse proxy.
- Secrets compared in constant time (`lib/timing-safe.ts`); rate limiting
  in-memory per process.
- Upload validation: MIME allowlist + magic bytes (`lib/upload-validation.ts`).
- Files served only via authenticated routes; never public URLs.
- Audit log for every state-changing admin action (`AUDIT_ACTIONS`).

## 9. Deployment Architecture

```
Internet → reverse proxy (TLS) → Next.js standalone (node:22-slim)
                                    ├─ Postgres mode: db (postgres:17-alpine)
                                    └─ Lite mode: PGlite in-process, volume-mounted data dir
File storage: local-disk volume (S3/Azure swappable in Settings)
SMTP: provider-agnostic (configured in Settings)
```

- `docker-compose.yml` — app + Postgres 17 (recommended for production)
- `docker-compose.lite.yml` — single container, embedded PGlite
- `docker-compose.db-only.yml` — Postgres only, for local development
- Entrypoint applies migrations in the appropriate mode and seeds once
  (idempotent, marker file).
- Health: `GET /api/health` (200 + `{status:"ok"}`).

## 10. Key Design Decisions

1. **PGlite as the embedded engine** instead of SQLite — one schema, full
   Postgres semantics, and the deployment choice is an env var.
2. **Migrations stay canonical Postgres DDL**; the lite runner consumes them
   as data (checksum ledger) rather than forking the migration history.
3. **Trainer = roster entity + optional User link** — guest instructors never
   need accounts; trainer logins arrive via the seeded Trainer role.
4. **Credentials-only auth in Phase 0**; SSO returns in a later phase using
   the proven mitch-risk pattern.
5. **Manual payments first** (cash/transfer/terminal recording) — gateways
   (Stripe/SEPA/PayPal) are Phase 10+ and shape invoices only then.

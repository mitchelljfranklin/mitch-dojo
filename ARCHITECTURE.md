# Mitch‑Dojo — Architecture Solution Design Document

> **Version:** 0.1.0 (Phase 5b)
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
| 4 | **Belts & gradings**: per-discipline belt ladders, student promotion history (denormalised), cumulative attendance-based eligibility with instructor override | Done |
| 5 | **Historical attendance & belt-history import**: per-student backfill sheet, attendance CSV import (creates missing past sessions, idempotent), belt-history CSV import (belts must exist first) | Done |
| 5b | **Disciplines & global belt ranks**: Discipline entity, belt ladders per discipline (not per course), student rank global across all locations teaching that discipline, cumulative eligibility counts all courses of the discipline combined | Done |
| 6 | Memberships & payments: plan builder, enrollments, invoices + manual payments, overdue tracking | Done |
| 7 | **Communication**: scheduler-driven reminders (class / payment / birthday) with editable templates and toggles in Settings, student→guardian recipient fallback, once-per-period dedup via NotificationLog | Done |
| 8 | **Analytics**: dedicated page — overview counters, weekly attendance trend with location filter, monthly recorded-revenue chart, at-risk retention list, members per location. Invoices may carry an optional location for per-location revenue; recurring invoices stay school-wide and count only towards "All locations" | Done |
| 9 | Trials & leads: trial pipeline, conversion tracking, public booking page | Planned |
| 10 | Member portal: self-service schedule/check-in/details | Planned |
| 11+ | Stripe/SEPA/PayPal, white-label, REST API + Swagger | Planned |

Out of scope (explicitly): SMS/WhatsApp marketing, funnel/landing-page
builders, POS storefront, project management, kiosk apps, native mobile apps.

## 2.1 Multi-location model

The tenant is the **school** (e.g. "Hino Tori Karate"); `Location` rows are
its **dojo sites**. Semantics locked in at Phase 1:

- **Locations are organisational, not an access boundary.** All staff see all
  locations; locations exist to filter views and group data. Per-location
  access isolation is explicitly out of scope.
- **Students train at one or more locations** (`StudentLocation` M:N), with a
  designated **primary (home) dojo** (`isPrimary` — exactly one per student,
  enforced in the data layer) used for reporting and eligibility.
- **Students train one or more disciplines** (`StudentDiscipline` M:N,
  required — at least one). Only discipline-assigned students appear in that
  discipline's progression table; the migration backfilled links from belt
  history and attendance.
- **Every class belongs to exactly one location** (required `locationId` on
  `Course`/`TrainingTime`).
- Deletion safety: a location with assigned students cannot be deleted —
  deactivate it instead; hard delete only when unreferenced.

## 2.2 Disciplines & belt ranks (Phase 5b)

A school may teach **multiple disciplines** (e.g. Karate, Jujitsu), each with
its own belt ladder and grading criteria.

- **`Discipline`** entity: name, active flag. Each discipline owns its belt
  ladder (`BeltRangeEntry.disciplineId`).
- **`Course.disciplineId`** (required): every course teaches one discipline.
  A discipline taught at multiple locations = one course per location, each
  with its own schedule/attendance.
- **Student rank is per discipline, global across all locations.** A student
  promoted to Yellow (Karate) at location A is Yellow at every location
  teaching Karate. Promote from any course's progression page — the rank
  updates globally for that discipline.
- **Eligibility is cumulative across all courses of the discipline.** A
  student training Karate at location A (Tuesdays) and location B (Thursdays)
  counts ALL trained sessions on both courses toward their Karate rank.
- A student in **two disciplines** has separate Karate and Jujitsu ranks.
  Karate attendance does not count toward the Jujitsu ladder, and vice versa.
- **Belt ladders are managed on the belts page** (`/belts/[disciplineId]`),
  not in Settings. "Load standard range" was removed — courses use their
  discipline's ladder directly.
- Belt entries that have been awarded cannot be deleted; history rows
  denormalise name/colour so they stay readable through reorganisations.
- Disciplines with courses cannot be deleted (reassign courses first).

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
| PGlite does not create missing directories | `lib/prisma.ts` and seed call `mkdirSync(recursive)` before opening |

## 5. Data Model (Phases 0–5b)

```
Role ──< User ──< AuditLog
              ├─< PasswordResetToken
              ├─< NotificationLog (sentBy, SetNull)
              ├─< Attendance (markedBy, SetNull)
              └─< StudentBelt (awardedBy, SetNull)

Trainer (0..1 User link) ──< Course

Discipline ──< BeltRangeEntry (ladder per discipline)
Discipline ──< Course (required disciplineId)
Course ──< TrainingTime (weekly recurring slot)
Course ──< ClassSession (generated, location denormalised at generation time)
Location ──< Course ──< ClassSession ──< Attendance >── Student
Location ──< StudentLocation >── Student

Discipline ──< BeltRangeEntry ──< StudentBelt >── Student
  (beltRangeEntryId FK, beltName/colourHex denormalised;
   rank is per discipline, global across all locations teaching it)

Student (photoKey, status TRIAL/ACTIVE/INACTIVE/ALUMNI, guardian, emergency contact)
Attachment (polymorphic entityType/entityId — "Student" documents)
```

### Belt eligibility (cumulative, per discipline)

A student's trainings for a discipline = count of ALL Present/Late attendance
across **every course of that discipline** (at any location), from their very
first class. A belt's `requiredTrainings` is the cumulative total needed to
be awarded that belt (0 for the entry rank) — e.g. Black at 300 means a
student training twice a week across two locations reaches it around the
3-year mark. Each belt's threshold is set once on the discipline's ladder
page rather than recomputed as "what's left" per rank.

Eligibility is surfaced as a badge; recording a promotion requires the
threshold unless the instructor ticks Override (make-up gradings,
exceptional progression). Belt entries that have been awarded cannot be
deleted; history rows denormalise name/colour so they stay readable through
reorganisations. Disciplines with courses cannot be deleted.

### Class sessions & attendance

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
becomes MANUAL. `TRAINED_STATUSES` = Present + Late — the basis for belt
eligibility and later retention analytics.

### Historical import (Phase 5)

Migrating schools bring history in three ways:

1. **Per-student backfill** — "Add past attendance" sheet on the student
   record: course, date, status. Creates missing past sessions automatically.
2. **Attendance CSV import** — long format (`Date, Course, Email/Names,
   Status`), creates missing past sessions, idempotent (already-recorded
   rows skipped), row-level errors for unknown courses/students.
3. **Belt history CSV import** — per-discipline (ladder must exist first),
   creates backdated `StudentBelt` rows, same-day duplicates skipped.

### Communication (Phase 7)

The scheduler sends three reminder types every tick, each individually
toggleable in Settings → Communication (with editable subject/body templates
and a sample-send):

- **Class reminders** — to ACTIVE/TRIAL students at the session's location
  who train the course's discipline (the check-in population), inside a
  configurable hours-before window.
- **Payment reminders** — once per invoice when it enters the due-soon
  window (days before due), and once more after a configurable number of
  days overdue.
- **Birthday emails** — on the day (Feb 29 birthdays only in leap years).

Recipients: student email, falling back to the guardian; skipped when
neither exists. Every send writes a `NotificationLog` row whose dedup key
(`assessmentId`) enforces once-per-period semantics — a repeated tick or a
restart never re-sends, and the whole pass bails out early when SMTP is
unconfigured so dedup keys are never burned by failed configuration.

Key relationships follow mitch-risk conventions: user deletion preserves
history via `SetNull` ("Deleted user"); delete cascades are explicit and
per-model. Deleting a student removes their photo and attachments from
storage; the orphan sweep collects `students.photoKey`,
`attachments.storageKey`, and the brand logo as referenced keys.

## 5.1 Identity & Access

- **Auth.js v5**, JWT sessions, sliding-window expiry
  (`operations.sessionTimeoutMinutes`, default 30).
- **Credentials provider** — bcrypt (12 rounds), rate-limited per IP.
- **RBAC:** permission catalog in `lib/permissions.ts` (students, locations,
  classes, attendance, belts, memberships, communications, administration,
  profile), three seeded system roles (**Admin** — all keys, **Trainer** —
  floor operations, **Viewer** — read-only). Custom roles via Settings →
  Roles.
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
5. **Belt ladders are per discipline, not per course.** A student's rank is
   global across all locations teaching that discipline. Eligibility counts
   cumulative attendance across ALL courses of the discipline combined.
6. **Manual payments first** (cash/transfer/terminal recording) — gateways
   (Stripe/SEPA/PayPal) are Phase 11+ and shape invoices only then.
7. **Historical import over synthetic credits** — migrating schools import
   dated rows (which create real past sessions) rather than a per-student
   starting-credit offset, keeping the data model honest.
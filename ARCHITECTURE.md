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
| 0 | Scaffold: auth, RBAC, settings, audit, scheduler, storage, email, dual-mode DB, Docker, CI, docs | **Current** |
| 1 | Students: CRUD, search, CSV import/export, attachments | Planned |
| 2 | Classes & schedule: courses, trainers, training times, sessions, calendar | Planned |
| 3 | Attendance & QR check-in: session marking, public check-in pages, analytics | Planned |
| 4 | Belts & gradings: belt levels per course, promotions, eligibility from attendance | Planned |
| 5 | Memberships & payments: plan builder, enrollments, invoices + manual payments, overdue tracking | Planned |
| 6 | Communication: templates, reminders (class/payment/birthday) via scheduler | Planned |
| 7 | Analytics: active members, attendance trends, retention signals, revenue summary | Planned |
| 8 | Trials & leads: trial pipeline, conversion tracking, public booking page | Planned |
| 9 | Member portal: self-service schedule/check-in/details | Planned |
| 10+ | Stripe/SEPA/PayPal, white-label, multi-location, REST API + Swagger | Planned |

Out of scope (explicitly): SMS/WhatsApp marketing, funnel/landing-page
builders, POS storefront, project management, kiosk apps, native mobile apps.

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

## 5. Data Model (Phase 0)

```
Role ──< User ──< AuditLog
              ├─< PasswordResetToken
              └─< NotificationLog (sentBy, SetNull)

AppSetting (category/key/value Json/isSecret)  — all runtime config
```

Domain models (Student, Trainer, Course, TrainingTime, ClassSession,
Attendance, BeltLevel, StudentBeltProgress, MembershipPlan, StudentMembership,
Invoice/Payment) arrive with their phases. Trainer is a standalone entity with
an optional nullable `User` link — roster data and auth identity stay
decoupled, and trainers without system accounts still appear on schedules.

Key relationships follow mitch-risk conventions: user deletion preserves
history via `SetNull` ("Deleted user"); delete cascades are explicit and
per-model.

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

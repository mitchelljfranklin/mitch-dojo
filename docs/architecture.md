# Architecture

A condensed, up-to-date summary lives here; the canonical design of record is
[`ARCHITECTURE.md`](https://github.com/) in the repository root.

## Stack

Next.js 16 (App Router) + TypeScript strict + React 19 · Prisma 7 ·
PostgreSQL 17 (server) or PGlite (embedded) · Auth.js v5 · Tailwind 4 +
shadcn/ui · Nodemailer + React Email · Vitest + Playwright.

## Dual database mode

One schema, one migration set, two adapters:

```
DATABASE_PROVIDER=postgres  → @prisma/adapter-pg → DATABASE_URL
DATABASE_PROVIDER=pglite    → @electric-sql/pglite → DATABASE_DIR
```

`lib/prisma.ts` selects the adapter at runtime. Migrations are canonical
PostgreSQL DDL; in lite mode `scripts/migrate-pglite.mjs` applies them with a
checksum ledger.

## Security

Nonce-based CSP in `proxy.ts` (document GETs only), constant-time secret
comparison, bcrypt credential hashing, AES-256-GCM encrypted settings
secrets, RBAC enforced server-side on every action, authenticated-only file
serving.

## Roles

| Role | Access |
|---|---|
| Admin | Everything, including users, roles, and the admin area |
| Trainer | Students, classes, attendance, belts (floor operations) |
| Viewer | Read-only |

Custom roles are configurable in-app; permissions are `resource:action` keys
enforced server-side and hidden client-side when absent.

## Roadmap

**Locations & students (1)** → Classes & schedule (2) → Attendance & QR
check-in (3) → Belts & gradings (4) → **Historical attendance & belt-history
import (5)** → **Disciplines & global belt ranks (5b)** → Memberships &
manual payments (6) → Communication (7) → Analytics (8) → Trials (9) →
Member portal (10) → White-label branding (11) → Student address details
(11b) — all **done**. Next: payment gateways & REST API (12).

## Multi-location

The tenant is the **school**; `Location` rows are its dojo sites. Students
train at one or more locations with exactly one primary (home) dojo; every
class belongs to exactly one location. Locations are organisational
only — all staff see all locations, and views filter by them.

## Disciplines & belt ranks (Phases 4–5b)

Each **discipline** (Karate, Jujitsu, …) owns its belt ladder. Courses are
linked to a discipline, and a student's rank is **per discipline, global
across all locations** teaching it — promote from any course page, the rank
updates everywhere. Eligibility counts cumulative attendance across **all
courses of that discipline combined** (so a student training at two
locations accumulates toward one rank). A student in two disciplines has
separate, independent ranks.

## Importing history (Phase 5)

Migrating schools bring their history in three ways: a per-student **past
attendance** sheet (creates missing past sessions automatically), an
**attendance CSV** import (long format, idempotent — already-recorded rows
are skipped), and a **belt history** CSV import (belts must exist in the
discipline's ladder first). Unknown courses/students/belts are reported as
row errors, never auto-created.
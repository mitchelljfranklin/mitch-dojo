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
| Admin | Everything, including users, roles, settings |
| Trainer | Students, classes, attendance, belts (floor operations) |
| Viewer | Read-only |

Custom roles are configurable in-app; permissions are `resource:action` keys
enforced server-side and hidden client-side when absent.

## Roadmap

**Locations & students (1)** → Classes & schedule (2) → Attendance & QR
check-in (3) → Belts & gradings (4) → Memberships & manual payments (5) →
Communication (6) → Analytics (7) → Trials (8) → Member portal (9) →
Gateways & extras (10+).

## Multi-location

The tenant is the **school**; `Location` rows are its dojo sites. Students
train at one or more locations with exactly one primary (home) dojo; every
class belongs to exactly one location (Phase 2). Locations are organisational
only — all staff see all locations, and views filter by them.

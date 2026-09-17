# Mitch-Dojo

**Open-source, self-hosted dojo management software.** Run your martial arts
school — students, classes, attendance, belt progressions, memberships — with
one tool you own.

Mitch-Dojo is fully open source under the **AGPL-3.0** and is built on the same
proven stack as [Mitch-Risk](https://github.com/) (its sibling project): Next.js
+ TypeScript + PostgreSQL/Prisma, deployed with Docker Compose.

## Status: Phases 0–11b complete

The platform is feature-complete through the white-label phase:

- Authentication (credentials + first-run admin setup) with Auth.js (NextAuth v5)
- Role-based access control with three system roles (**Admin**, **Trainer**,
  **Viewer**) and a dojo-flavoured permission catalog
- Students & locations (multi-location, CSV import/export, photos + attachments)
- Classes & schedule, attendance & public QR check-in
- Belts & gradings with per-discipline ladders and historical import
- Memberships & payments (plans, invoices, manual payments, overdue tracking)
- Communication reminders (class / payment / birthday / trial follow-up) with
  editable templates and an email log with retry
- Analytics dashboard, trial pipeline with a public booking page, and a
  read-only member portal
- White-label branding (org name + logo on public/member surfaces and emails)
- Single sign-on (Entra ID, Google, or any OIDC provider) with
  auto-provisioning and a single-use break-glass URL for emergencies
- DB-backed runtime settings — everything configurable in-app, no file edits
- Audit log with retention pruning; built-in scheduler; email over SMTP
- **Two deployment modes** with one schema and one migration set:
  - **Postgres mode** (`DATABASE_PROVIDER=postgres`) — app + PostgreSQL 17
    containers, recommended for production
  - **Lite mode** (`DATABASE_PROVIDER=pglite`) — a single container with an
    embedded PostgreSQL (PGlite), zero external database services

Payment gateways and a REST API (Phase 12) are the remaining roadmap items —
see [ARCHITECTURE.md](ARCHITECTURE.md) and [phasereview.md](phasereview.md).

## Quick start (Docker Compose)

```bash
cp .env.example .env
# set AUTH_SECRET, APP_ENCRYPTION_KEY, CRON_SECRET (openssl rand -hex 32 each)
docker compose up -d --build
# open http://localhost:3000 — the first visit walks you through admin setup
```

Lite mode (single container, embedded database):

```bash
docker compose -f docker-compose.lite.yml up -d --build
```

## Local development

```bash
npm install --legacy-peer-deps
docker compose -f docker-compose.db-only.yml up -d   # or set DATABASE_PROVIDER=pglite
cp .env.example .env                                 # fill in the secrets
npx prisma migrate deploy
npm run db:seed
npm run dev
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (standalone output) |
| `npm run precheck` | typecheck + lint + format:check (same as CI) |
| `npm run test` | Unit + integration tests (Vitest) |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:deploy` | Apply migrations in production (Postgres mode) |
| `npm run db:deploy:lite` | Apply migrations to an embedded PGlite database |
| `npm run db:seed` | Seed system roles + default settings (idempotent) |
| `npm run bump -- X.Y.Z` | Update all 4 version spots (package.json, Dockerfile, build-info, ARCHITECTURE.md) |
| `npm run docs:dev` | VitePress docs dev server |

## License

[AGPL-3.0](LICENSE)

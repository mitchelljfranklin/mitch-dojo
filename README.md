# Mitch-Dojo

**Open-source, self-hosted dojo management software.** Run your martial arts
school — students, classes, attendance, belt progressions, memberships — with
one tool you own.

Mitch-Dojo is fully open source under the **AGPL-3.0** and is built on the same
proven stack as [Mitch-Risk](https://github.com/) (its sibling project): Next.js
+ TypeScript + PostgreSQL/Prisma, deployed with Docker Compose.

## Status: Phase 0 (scaffold)

The platform scaffold is complete:

- Authentication (credentials + first-run admin setup) with Auth.js (NextAuth v5)
- Role-based access control with three system roles (**Admin**, **Trainer**,
  **Viewer**) and a dojo-flavoured permission catalog
- DB-backed runtime settings (organization, branding, operations, storage,
  email) — everything configurable in-app, no file edits
- Audit log with retention pruning
- Built-in scheduler (reminders, pruning, orphan-file sweep in later phases)
- Email delivery over SMTP (React Email templates)
- **Two deployment modes** with one schema and one migration set:
  - **Postgres mode** (`DATABASE_PROVIDER=postgres`) — app + PostgreSQL 17
    containers, recommended for production
  - **Lite mode** (`DATABASE_PROVIDER=pglite`) — a single container with an
    embedded PostgreSQL (PGlite), zero external database services

 dojo management modules (students, classes, attendance, belts & gradings,
memberships) land in phases 1–5; see [ARCHITECTURE.md](ARCHITECTURE.md) for the
roadmap.

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
| `npm run docs:dev` | VitePress docs dev server |

## License

[AGPL-3.0](LICENSE)

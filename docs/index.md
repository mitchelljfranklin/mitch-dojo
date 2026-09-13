# Mitch-Dojo

**Open-source, self-hosted dojo management software** for martial arts
schools: students, classes, attendance, belt progressions, memberships, and
communication — in one tool you own.

Built on the same stack as Mitch-Risk: Next.js + TypeScript, PostgreSQL +
Prisma, Docker Compose. Fully AGPL-3.0.

## Features

Phase 0 (current) ships the platform: authentication, roles & permissions,
in-app settings, audit log, scheduler, email, file storage, and two
deployment modes (Postgres server or embedded single-container).

The dojo modules land phase by phase — see the [Architecture](/architecture)
for the full roadmap.

## Deployment modes

| Mode | Containers | Database |
|---|---|---|
| **Postgres** (recommended) | app + postgres | PostgreSQL 17 server |
| **Lite** | app only | embedded PostgreSQL (PGlite), volume-mounted |

Both modes use the same schema and the same migration files; switching is a
single environment variable (`DATABASE_PROVIDER`).

See [Deployment](/deployment) for setup.

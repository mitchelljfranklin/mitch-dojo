# Mitch-Dojo

**Open-source, self-hosted dojo management software** for martial arts
schools: students, classes, attendance, belt progressions, memberships, and
communication — in one tool you own.

Built on the same stack as Mitch-Risk: Next.js + TypeScript, PostgreSQL +
Prisma, Docker Compose. Fully AGPL-3.0.

## Features

The platform ships the full dojo suite: authentication, roles & permissions,
students & locations, classes & schedule, attendance & QR check-in, belts &
gradings with historical import, memberships & payments, communication
reminders, analytics, a trial pipeline with a public booking page, a read-only
member portal, white-label branding, and an audit log — all configurable
in-app under **Admin**, with two deployment modes (Postgres server or embedded
single-container).

Payment gateways and a REST API (Phase 12) are planned — see the
[Architecture](/architecture) for the full roadmap.

## Deployment modes

| Mode | Containers | Database |
|---|---|---|
| **Postgres** (recommended) | app + postgres | PostgreSQL 17 server |
| **Lite** | app only | embedded PostgreSQL (PGlite), volume-mounted |

Both modes use the same schema and the same migration files; switching is a
single environment variable (`DATABASE_PROVIDER`).

See [Deployment](/deployment) for setup.

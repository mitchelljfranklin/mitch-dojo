# Dual-Mode Database

One schema, one migration set, two connection modes — the deployment choice is a single environment variable.

## The modes

```
DATABASE_PROVIDER=postgres
  └─ @prisma/adapter-pg → DATABASE_URL (PostgreSQL 17 server)
                          prisma migrate deploy manages the schema

DATABASE_PROVIDER=pglite
  └─ @electric-sql/pglite (embedded Postgres WASM) at DATABASE_DIR
     scripts/migrate-pglite.mjs applies the same migration SQL
     with a checksum ledger (_mitch_dojo_migrations)
```

## Why PGlite instead of SQLite

PGlite runs **real Postgres semantics** — enums, JSON columns, and scalar arrays all behave exactly as on the server. That means the schema and DDL never fork between modes, and a dojo can start on a Raspberry Pi (lite) and move to a full Postgres stack later without touching data definitions.

## Migrations

Migrations are **canonical Postgres SQL** — authored against a real Postgres (Docker), consumed by both modes:

- **Postgres mode**: `prisma migrate deploy`, standard checksums.
- **Lite mode**: `scripts/migrate-pglite.mjs` reads the same `prisma/migrations/*.sql` files and applies them in order, tracking a checksum ledger. Editing an already-applied migration breaks the ledger — always add a follow-up migration instead.

Seeding is idempotent in both modes (system roles, default settings, marker-file guarded in containers).

## Constraints & mitigations

| Constraint | Mitigation |
|---|---|
| `prisma migrate dev/deploy` cannot drive PGlite | Author against Postgres; consume via the lite runner |
| Single connection, serialised queries | Fine for a single dojo — the platform's target scale |
| No TCP access in lite mode | No pgAdmin/BI; backups are stop-copy-start of `DATABASE_DIR` ([Backups](../deployment/backups)) |
| WASM assets in the standalone build | PGlite is externalised via `serverExternalPackages` so the Docker runtime resolves it |
| Data directory is the whole database | Must be a mounted volume; single-process access enforced |

## Switching modes

Set `DATABASE_PROVIDER` (and the matching `DATABASE_URL` or `DATABASE_DIR`) and start. Moving data between modes is a backup/restore of records — the schema is identical on both sides.

# Lite Mode (Embedded)

A **single container** with an embedded PostgreSQL (PGlite) — no external database service. Ideal for a Raspberry Pi, a small VPS, or a homelab box.

## Start

```bash
docker compose -f docker-compose.lite.yml up -d --build
# … or the pre-built image (no build tools needed):
docker compose -f docker-compose.lite-pull.yml up -d
```

One container, embedded database, data in the `pglite_data` volume (which **must** remain a mounted volume — it's your entire database). All environment values are inline in the compose file — edit the three `change-me` secrets before exposing the app publicly.

## Startup sequence

Strictly **migrate → backup → seed → serve**:

1. `scripts/migrate-pglite.mjs` applies the canonical migration SQL with a checksum ledger (Prisma's migrate CLI cannot drive PGlite directly).
2. Before every migration run, the database is snapshotted into the `pglite_backups` volume (last 3 kept).
3. Seeding runs once (idempotent, marker file).
4. The app serves.

Because the embedded DB is single-process, only the app ever touches the data directory — that's what makes updates safe.

## Updating a lite deployment

Updates are safe — stop, pull/rebuild, start:

```bash
docker compose -f docker-compose.lite.yml pull   # or git pull
docker compose -f docker-compose.lite.yml up -d --build
```

If an update fails midway, restore the newest pre-migration snapshot:

```bash
docker compose -f docker-compose.lite.yml down
docker run --rm -v mitch-dojo_pglite_data:/data -v mitch-dojo_pglite_backups:/backups alpine \
  sh -c "rm -rf /data/* && cp -a /backups/pglite-backup-<newest>/. /data/"
docker compose -f docker-compose.lite.yml up -d
```

(Adjust volume names to your project's prefix — check with `docker volume ls`.)

## Operational notes

- **PGlite is real PostgreSQL** — enums, JSON, and array columns behave exactly as in server mode. The schema never forks between modes; switching is a single environment variable.
- **No TCP access to the database** — pgAdmin/BI tools can't connect directly. Backups are stop-copy-start of the data directory (see [Backups](./backups)).
- **Single connection** — queries run serially. That's fine for a single dojo; the platform is sized for it.
- Full dual-mode details: [Dual-Mode Database](../advanced/dual-mode-database).

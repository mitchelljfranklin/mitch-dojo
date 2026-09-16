# Deployment

Mitch-Dojo deploys with Docker Compose. All runtime configuration happens
in-app under **Admin** after first launch; only secrets and database
connectivity belong in the environment.

## 1. Prepare the environment

```bash
cp .env.example .env
```

Set the three secrets (each 32+ characters):

```bash
openssl rand -hex 32   # AUTH_SECRET
openssl rand -hex 32   # APP_ENCRYPTION_KEY
openssl rand -hex 32   # CRON_SECRET
```

## 2. Choose a mode

### Postgres mode (recommended)

```bash
docker compose up -d --build
```

App + PostgreSQL 17. The container applies `prisma migrate deploy` and seeds
system roles/settings on first boot.

### Lite mode (single container)

```bash
docker compose -f docker-compose.lite.yml up -d --build
```

One container with an embedded PostgreSQL (PGlite). Data lives in the
`pglite_data` volume.

#### Updating a lite deployment

Updates are safe: stop the container, pull/rebuild the image, start again.
The startup sequence is strictly **migrate → seed → serve**, so the embedded
database is never touched by two processes at once. Before every migration
run the container snapshots the database into the `pglite_backups` volume
(last 3 kept).

If an update ever fails midway, restore the newest backup:

```bash
docker compose -f docker-compose.lite.yml down
docker run --rm -v mitch-dojo_pglite_data:/data -v mitch-dojo_pglite_backups:/backups alpine \
  sh -c "rm -rf /data/* && cp -a /backups/pglite-backup-<newest>/. /data/"
docker compose -f docker-compose.lite.yml up -d
```

(Adjust the volume names to your project's prefix — check with
`docker volume ls`.)

#### Scheduled backups (recommended, especially on a Raspberry Pi)

The pre-migration backups protect against a failed update, not against SD
card wear or power loss. Snapshot the volume on a schedule too — weekly is a
good baseline:

```bash
# /etc/cron.weekly/dojo-backup (on the host)
docker run --rm -v mitch-dojo_pglite_data:/data -v /var/backups/dojo:/backup alpine \
  tar czf /backup/pglite-$(date +%F).tar.gz -C /data .
# prune: keep the last 8
ls -1t /var/backups/dojo/pglite-*.tar.gz | tail -n +9 | xargs -r rm
```

Restore = stop the container, extract the archive into the volume, start.

## 3. First run

Open `http://localhost:3000` — the app redirects to first-run setup where you
create the initial administrator account. Afterwards, configure the dojo
under **Admin**.

## Reverse proxy (TLS)

Put Caddy or nginx in front of the app for TLS. Set `TRUSTED_PROXY_COUNT` to
the number of proxy hops so client-IP rate limiting stays accurate, and keep
the app port off the public interface in production.

## Environment reference

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_PROVIDER` | yes | `postgres` or `pglite` |
| `DATABASE_URL` | postgres mode | Postgres connection string |
| `DATABASE_DIR` | pglite mode | Path for the embedded data directory |
| `AUTH_SECRET` | yes | Session signing secret |
| `APP_ENCRYPTION_KEY` | yes | Encrypts secrets stored in Settings |
| `APP_URL` | yes | Public base URL |
| `CRON_SECRET` | production | Protects `/api/cron/run` |
| `DATA_STORAGE_PATH` | yes | File storage root |
| `TRUSTED_PROXY_COUNT` | yes (default 0) | Proxy hop count |

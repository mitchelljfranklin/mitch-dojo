# Deployment

Mitch-Dojo deploys with Docker Compose. All runtime configuration happens
in-app under **Settings** after first launch; only secrets and database
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
`pglite_data` volume; backups are stop-copy-start of that volume.

## 3. First run

Open `http://localhost:3000` — the app redirects to first-run setup where you
create the initial administrator account. Afterwards, configure the dojo
under **Settings**.

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

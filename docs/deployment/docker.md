# Docker Compose

The recommended production deployment: the app container plus PostgreSQL 17.

## Pre-built image (no build tools needed)

```bash
curl -O https://raw.githubusercontent.com/mitchelljfranklin/mitch-dojo/master/docker-compose.pull.yml
```

Edit `docker-compose.pull.yml` and change the three `change-me` secrets
(each `openssl rand -hex 32`), then:

```bash
docker compose -f docker-compose.pull.yml up -d
```

This pulls the published image from GitHub Container Registry instead of building from source. Everything below applies identically.

## 1. Prepare the environment

```bash
git clone https://github.com/mitchelljfranklin/mitch-dojo.git
cd mitch-dojo
```

All environment values live inline in `docker-compose.yml` — no `.env` file
needed. Change the three `change-me` secrets (each 32+ characters):

```bash
openssl rand -hex 32   # AUTH_SECRET
openssl rand -hex 32   # APP_ENCRYPTION_KEY
openssl rand -hex 32   # CRON_SECRET
```

## 2. Start the stack

```bash
docker compose up -d --build
```

This starts:

- **app** — the Next.js standalone server (node:22-slim)
- **db** — PostgreSQL 17 with a persistent volume

The entrypoint applies `prisma migrate deploy` and seeds system roles + default settings once (idempotent, marker-file guarded), then serves.

## 3. First run

Open `http://localhost:3000` — the app redirects to first-run setup where you create the initial administrator account. Afterwards, configure the dojo under **Admin** (see the [configuration guide](../configuration/overview)).

## Updating

```bash
git pull
docker compose up -d --build
```

Migrations apply automatically on boot. Data lives in the named Postgres volume; rebuilds don't touch it.

## Development database only

For local development against a real Postgres without running the app in Docker:

```bash
docker compose -f docker-compose.db-only.yml up -d
```

## Data & volumes

| Volume | Contents |
|---|---|
| Postgres data volume | All records — students, attendance, belts, invoices |
| `DATA_STORAGE_PATH` mount | Uploaded files (photos, attachments, logo) |

Back up both — see [Backups](./backups).

## Environment reference

All values live inline in the compose file (edit `docker-compose.yml` or
`docker-compose.pull.yml` directly — no `.env` file needed):

| Variable | Current value | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://mitch:mitch@db:5432/mitch_dojo` | Postgres connection string |
| `AUTH_SECRET` | `change-me-…` | Session signing secret (**min 32 chars**) |
| `APP_ENCRYPTION_KEY` | `change-me-…` | AES-256-GCM key for secrets at rest (**min 32 chars**) |
| `CRON_SECRET` | `change-me-…` | Protects `/api/cron/run` (**min 32 chars**, enforced) |
| `APP_URL` | `http://localhost:3000` | Public base URL (used in emails and public pages) |
| `DATA_STORAGE_PATH` | `/app/.storage/files` | File storage root |
| `TRUSTED_PROXY_COUNT` | `0` | Proxy hops for client-IP resolution |

> **Change the three `change-me` secrets before exposing the app publicly.**
> The container refuses to start if `CRON_SECRET` is shorter than 32 characters.

Health check: `GET /api/health` returns `200 {"status":"ok"}`.

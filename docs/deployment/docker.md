# Docker Compose

The recommended production deployment: the app container plus PostgreSQL 17.

## Pre-built image (no build tools needed)

```bash
curl -O https://raw.githubusercontent.com/mitchelljfranklin/mitch-dojo/master/docker-compose.pull.yml
curl -O https://raw.githubusercontent.com/mitchelljfranklin/mitch-dojo/master/.env.example
mv .env.example .env
```

Set the secrets in `.env` (each `openssl rand -hex 32`), then:

```bash
docker compose -f docker-compose.pull.yml up -d
```

This pulls the published image from GitHub Container Registry instead of building from source. Everything below applies identically.

## 1. Prepare the environment

```bash
git clone https://github.com/mitchelljfranklin/mitch-dojo.git
cd mitch-dojo
cp .env.example .env
```

Set the three secrets (each 32+ characters):

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

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_PROVIDER` | Yes | `postgres` for this mode |
| `DATABASE_URL` | Yes | Postgres connection string |
| `AUTH_SECRET` | Yes | Session signing secret (min 32 chars) |
| `APP_ENCRYPTION_KEY` | Yes | AES-256-GCM key for secrets at rest |
| `APP_URL` | Yes | Public base URL (used in emails and public pages) |
| `CRON_SECRET` | Yes (prod) | Protects `/api/cron/run` |
| `DATA_STORAGE_PATH` | Yes | File storage root |
| `TRUSTED_PROXY_COUNT` | No (default 0) | Proxy hops for client-IP resolution |

Health check: `GET /api/health` returns `200 {"status":"ok"}`.

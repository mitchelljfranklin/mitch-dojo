# Quick Start

Get Mitch‑Dojo running in minutes with Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose installed
- [Node.js](https://nodejs.org/) 22.23.4+, 24.22.1+, or 26.12.1+ (for local development only)
- [Git](https://git-scm.com/) (to clone the repository)

## Docker Compose Quickstart

### Postgres mode (recommended)

All environment values live inline in the compose files — no `.env` needed.

```bash
git clone https://github.com/mitchelljfranklin/mitch-dojo.git
cd mitch-dojo
```

Edit `docker-compose.yml` and change the three `change-me` secrets (each 32+
characters — generate with `openssl rand -hex 32`), then start the stack:

```bash
docker compose up -d --build
```

The container applies migrations, seeds the default settings and system roles, and starts serving.

### Pre-built image (no build tools needed)

```bash
curl -O https://raw.githubusercontent.com/mitchelljfranklin/mitch-dojo/master/docker-compose.pull.yml
```

Edit `docker-compose.pull.yml` and change the three `change-me` secrets, then:

```bash
docker compose -f docker-compose.pull.yml up -d
```

### Lite mode (single container, embedded database)

No external database required — data lives in a volume-mounted embedded
PostgreSQL (PGlite):

```bash
docker compose -f docker-compose.lite.yml up -d --build
# … or the pre-built image (no build tools needed):
docker compose -f docker-compose.lite-pull.yml up -d
```

See [Lite Mode](./deployment/lite) for the full runbook, including backups.

## First Login

1. Open `http://localhost:3000` — you are redirected to first-run setup.
2. Create your administrator account (email + password, minimum 12 characters).
3. Setup is only available while no users exist — afterwards it is disabled.

## Next Steps

After logging in, set up your dojo:

1. **Locations** — go to Admin → Locations and add each dojo site you run classes at.
2. **Disciplines & belts** — create your disciplines and their belt ladders on the Belts & Gradings page.
3. **Trainers & classes** — add trainers, then create courses with their weekly training times.
4. **Memberships** — set your currency and invoice rules under Admin → Memberships, then build your plans.
5. **Email** — enter your SMTP details under Admin → Email and send a test from Admin → Templates.
6. **White-label branding** — set your organization name under Admin → General, then upload light/dark logos, colours, layout, and booking copy under Admin → Appearance. Set the email From name/address under Admin → Email. The result appears on the booking page, portal, check-in screens, staff UI, emails, and PDFs.
7. **Add students** — import your existing members via CSV or add them one by one.

## Local Development

```bash
npm install --legacy-peer-deps
docker compose -f docker-compose.db-only.yml up -d
cp .env.example .env                                 # fill in the secrets
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

### Useful Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run precheck` | Run typecheck + lint + format:check (same as CI) |
| `npm run test` | Run unit + integration tests |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:deploy` | Apply migrations in production (Postgres mode) |
| `npm run db:deploy:lite` | Apply migrations to an embedded PGlite database |
| `npm run db:seed` | Seed system roles + default settings (idempotent) |
| `npm run bump -- X.Y.Z` | Update all version spots in one step |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_PROVIDER` | Yes | `postgres` (server) or `pglite` (embedded) |
| `DATABASE_URL` | Postgres mode | PostgreSQL connection string |
| `DATABASE_DIR` | Lite mode | Path for the embedded data directory (must be a mounted volume) |
| `AUTH_SECRET` | Yes | Auth.js JWT signing secret (min 32 chars) |
| `APP_ENCRYPTION_KEY` | Yes | Key for AES-256-GCM encryption of secrets at rest (min 32 chars) |
| `APP_URL` | Yes | Public base URL used for links in emails and public pages |
| `CRON_SECRET` | Yes (prod) | Protects `/api/cron/run` (sent as `x-cron-secret` header) |
| `DATA_STORAGE_PATH` | Yes | Local file storage root |
| `TRUSTED_PROXY_COUNT` | No (default 0) | Number of trusted reverse proxy hops for client-IP rate limiting |

> **Important:** `CRON_SECRET` is required in production. `TRUSTED_PROXY_COUNT` must match your actual proxy hop count — see [Reverse Proxy](./deployment/reverse-proxy) for details.

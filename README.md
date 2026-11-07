# Mitch‑Dojo

[![CI](https://img.shields.io/github/actions/workflow/status/mitchelljfranklin/mitch-dojo/ci.yml?branch=master)](https://github.com/mitchelljfranklin/mitch-dojo/actions)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-brightgreen)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/mitchelljfranklin/mitch-dojo)](https://github.com/mitchelljfranklin/mitch-dojo/releases/latest)
[![GitHub stars](https://img.shields.io/github/stars/mitchelljfranklin/mitch-dojo)](https://github.com/mitchelljfranklin/mitch-dojo/stargazers)

> A self-hosted, white-label dojo management solution. Free, open-source, deploy anywhere.

---

## Why Mitch‑Dojo

Dojo management is a real operational problem — but a small one. Commercial platforms like Zen Planner, Kicksite, and Clubworx sell subscriptions per member, lock your data behind their dashboards, and carry feature sets aimed at multi-location fitness franchises. These are excellent products built by talented teams.

But that value comes at a cost — the per-member subscription, the onboarding overhead, the data you can't export. For an instructor or office manager running a single school, that barrier is real.

Mitch‑Dojo strips dojo management down to its essentials: know who is training, when, and how far they have progressed. Record attendance, track belts, bill memberships, remind people about class, and give families a portal to check progress and balance. No SMS marketing, no funnel builders, no per-member fees. Your data stays in your database, exportable to CSV at any time, running in Docker Compose.

---

## Quick Start

### Pre-built image (recommended)

No build tools required — just Docker. Use the pre-built image from
[GitHub Container Registry](https://github.com/mitchelljfranklin/mitch-dojo/pkgs/container/mitch-dojo):

```bash
curl -O https://raw.githubusercontent.com/mitchelljfranklin/mitch-dojo/master/docker-compose.pull.yml
# Edit docker-compose.pull.yml — change the three change-me secrets
# (openssl rand -hex 32 for each)

docker compose -f docker-compose.pull.yml up -d
# Open http://localhost:3000 — first visit walks you through admin setup
```

### Build from source

```bash
git clone https://github.com/mitchelljfranklin/mitch-dojo.git
cd mitch-dojo
# Edit docker-compose.yml — change the three change-me secrets.
# The container refuses to start if CRON_SECRET is shorter than 32 characters.

docker compose up -d --build
# Open http://localhost:3000 — first visit walks you through admin setup
```

> All environment values live inline in the compose files — no `.env` file
> needed. The Compose stack defaults to database credentials `mitch`/`mitch`
> and DB `mitch_dojo`; edit those values in the compose file directly.

### Lite mode (single container, embedded database)

No external database required — an embedded PostgreSQL (PGlite) lives in a volume:

```bash
docker compose -f docker-compose.lite.yml up -d --build
# … or the pre-built image (no build tools needed):
docker compose -f docker-compose.lite-pull.yml up -d
```

Ideal for a Raspberry Pi or a small VPS. Both modes share one schema and one migration set; switching is a single environment variable. See the [Lite Mode guide](docs/deployment/lite.md) for the full runbook including backups.

---

## Features

### Students & Locations
- Multi-location enrolment with exactly one **primary (home) dojo** per student
- Photos, attachments, guardian contacts (with relationship) and emergency contacts, structured addresses
- Disciplines assignment — a student's rank is per discipline, global across all locations teaching it
- **Households** grouping siblings under one family contact, with guardian-detail inheritance
- Full lifecycle statuses (trial, active, inactive, alumni) and CSV import/export

### Classes & Schedule
- Trainer roster with optional login accounts — guest instructors never need one
- **Trainer verifications** — school-defined credential types (e.g. working-with-children checks, first aid, insurance) with numbers, expiry tracking, document scans, status badges, and expiry reminders
- Courses tied to exactly one location and one discipline, with recurring weekly times
- Per-slot **trial capacity** limiting public bookings onto a weekly class
- Sessions auto-generated two weeks ahead, idempotently; weekly timetable view per location
- Location moves keep attendance history intact

### Attendance & QR Check-in
- Session sheets: Present, Late, Excused, Absent — with bulk mark-all
- Attendance browser listing every session past and upcoming with marked/trained counts
- Printable branded attendance PDF per session
- No-login QR check-in pages per location, secured by a revocable token
- Check-ins feed belt eligibility automatically (Present and Late both count)
- Students with overdue invoices can be suspended from check-in automatically

### Belts & Gradings
- Per-discipline belt ladders — Karate and Jujitsu students progress independently
- Cumulative eligibility: every trained session across all courses of a discipline counts toward the next rank
- Threshold per belt with instructor override for make-up gradings
- **Grading events** — snapshot the eligible students, run the day, record outcomes and send invites
- Full promotion history that stays readable through ladder reorganisations
- Printable student report card (rank, training summary, balance) for parents

### Memberships & Payments
- Plan builder with billing periods and pricing
- Auto-generated recurring invoices, optionally tagged to a location for per-location revenue
- Configurable **tax / GST** rate on new invoices, captured at issue time
- Membership **hold** (pause/resume) with an optional auto-resume date
- Manual payment recording (cash, transfer, terminal) with partial payments and full history
- **Bulk payment** — select several open invoices and settle them in one pass
- Bulk **enrollment CSV import** matching students and plans
- Printable branded invoice PDF; overdue tracking with configurable windows and automatic check-in suspension

### Communication
- Scheduler-driven reminders: upcoming class, payment due/overdue, birthdays, trial follow-ups, agreement reminders
- Every reminder individually toggleable with its own timing window
- **Bulk email campaigns** to an audience (all/location/discipline/course/overdue), queued and drained by the scheduler
- Editable subject/body templates with tokens and a sample-send to test delivery
- Email log with statuses, failure errors, and one-click retry

### Trials & Leads
- Public trial-booking page at `/book` — for yourself or a child (guardian contact captured), rate-limited, honeypot-protected, branded; respects per-slot capacity
- Lead pipeline (New → Contacted → First class → Converted/Lost) with guarded stage transitions; the convert sheet can enroll and create the first invoice in one step
- Automated follow-up emails for trials that sit too long without converting; booking confirmations to prospects
- Conversion stats and one-click conversion to an active student

### Member Portal
- Staff-emailed magic links (hashed tokens, 30-day expiry); single-student or whole-household links
- Progress and belts, upcoming classes, recent attendance, invoices and balance
- Documents & consent — members read and digitally sign the school's agreements
- **Self-service**: update their own contact details and email preferences (audit-logged)
- **Downloads**: their own invoice and agreement PDFs, plus an `.ics` calendar of upcoming classes
- Student → guardian recipient fallback for links and all communications

### Analytics & Reports
- Overview counters, weekly attendance trend with location filter, monthly recorded revenue
- At-risk retention list surfacing students whose training has lapsed
- Members-per-location breakdown
- **Reports**: per-student attendance rate, birthdays & training anniversaries, revenue by plan with an estimated monthly recurring revenue — each exportable to CSV

### Compliance
- Health & medical section on the student record (medications, conditions, injuries), permission-gated as PHI
- School-managed agreement documents (privacy notice, informed consent, safety expectations, or your own) — versioned, disable/delete freely
- Digital signing through the member portal; staff-recorded paper fallback; printable branded forms
- Re-sign required automatically whenever a document's version moves past a signature
- **Compliance page** listing every member with an outstanding signature, plus optional scheduler reminders and an optional check-in gate
- **Incident reports / accident book** — dated, severity-rated incidents linked to a student and/or location, with open/closed tracking

### White-label branding
Mitch‑Dojo is designed to run as **your school's platform**, not ours. Branding is runtime configuration in [Admin → Appearance](docs/configuration/appearance.md) and [Admin → Email](docs/configuration/email.md) — no theme files to edit or rebuild.

- **Organization identity** — your school name drives the sidebar, browser titles, booking page, member portal, check-in screens, PDFs, and the `{{appName}}` email token
- **Logo system** — upload a light-background logo and an optional dark-background variant; the app swaps them automatically with the theme, login and public pages included
- **Email identity and logo** — set the From name/address under Admin → Email and choose which logo emails use (primary, or the dark variant on a dark plate)
- **Your colours and layout** — primary/secondary colours, corner radius, and content width for the staff UI (brand colours apply to the light theme; dark mode keeps its contrast-tuned palette)
- **Your booking copy** — replace the public booking headline and description with your own words
- **Branded PDFs** — invoices, report cards, attendance sheets, and printable agreements carry your organization name and primary logo; invoices also use your primary accent colour for status
- **Your domain** — point a custom domain at the deployment and set `APP_URL`; TLS and host routing live at the reverse proxy, not in the app
- **Clear boundaries** — this is controlled white-labeling, not arbitrary CSS/HTML injection; the source repository and documentation remain Mitch‑Dojo, and the AGPL-3.0 license still applies

### Languages & translation
- **12 languages**, selectable per device and configurable as the school default in Admin → General
- Language is stored in a cookie (`NEXT_LOCALE`); there is no `/en/` or `/es/` URL prefix. Switching is a soft refresh, so typed form values and selections survive
- Staff UI, auth screens, public booking, member portal, QR check-in, automated emails, and PDF labels are translated
- PDFs bundle **Noto Sans** families for Latin/Cyrillic, Arabic, Devanagari, and Japanese/Korean/Simplified Chinese
- **Authored content stays as written**: email template copy, agreement documents, course/plan names, notes, and custom role names are never machine-translated

| Language | Code | Status |
|---|---|---|
| English | `en` | Source catalog |
| Spanish | `es` | Complete |
| Portuguese | `pt` | Initial machine-assisted translation |
| French | `fr` | Initial machine-assisted translation |
| German | `de` | Initial machine-assisted translation |
| Italian | `it` | Initial machine-assisted translation |
| Japanese | `ja` | Initial machine-assisted translation |
| Korean | `ko` | Initial machine-assisted translation |
| Chinese (Simplified) | `zh` | Initial machine-assisted translation |
| Arabic | `ar` | Initial machine-assisted translation; RTL layout is best-effort |
| Hindi | `hi` | Initial machine-assisted translation |
| Russian | `ru` | Initial machine-assisted translation |

**Translation status.** English and Spanish are the maintained reference catalogs. The other ten are an initial machine-assisted pass. Key parity, ICU parsing, argument parity, plural/select structure, and key-name validity are enforced by the catalog tests; dates/numbers/currency use locale-aware formatting. Wording still benefits from native review. Corrections are welcome — edit the relevant `messages/<code>.json` value and run the catalog tests.

**PDF fonts.** PDFs use bundled Noto Sans families — Latin/Cyrillic, Arabic, Devanagari, and regional Japanese/Korean/Simplified Chinese — so all twelve languages can render without falling back to English. The fonts are OFL-licensed. Arabic and Hindi require complex-script shaping, and Arabic needs RTL pagination; both are best-effort and should be checked with real names before relying on them for official documents. CJK and Latin/Cyrillic rendering are straightforward.

**Adding a language.** The process is documented in [Adding a Language](docs/advanced/adding-a-language.md): add a catalog, register the locale, add the loader, and update the test fixture maps. The parity test fails until every key exists.

### Access Control
- 3 system roles (Admin, Trainer, Viewer) + custom roles
- 24 granular `resource:action` permissions
- UI controls hidden (not greyed) — a Viewer sees a clean read-only screen
- Single sign-on via Microsoft Entra ID, Google, or any OpenID Connect provider, with just-in-time provisioning
- SSO-only mode with anti-lock-out and a single-use **break-glass** URL for emergencies

### Security
- bcryptjs at 12 rounds for passwords and break-glass tokens
- AES-256-GCM encryption at rest for SMTP credentials, SSO client secrets, and cloud-storage keys
- Nonce-based `strict-dynamic` Content Security Policy
- Magic-byte file signature validation on uploads
- Rate limiting on login, password reset, break-glass, booking, and the cron endpoint
- Constant-time secret comparison; in-app secrets never returned to the client
- Audit log for every state-changing admin action, preserved through user deletion

### Platform
- Built-in 5-minute scheduler (reminders, invoices, pruning, orphan-file sweep) or external trigger via a secured endpoint
- Dual-mode database: PostgreSQL server or embedded PGlite — one schema, one migration set
- DB-backed settings for everything runtime-configurable; no file edits after deploy
- Two deployment modes with Docker Compose (app + Postgres, or single embedded container)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22.23.4+, 24.22.1+, or 26.12.1+ |
| Framework | Next.js 16 (App Router) + TypeScript strict |
| Database | PostgreSQL 17 + Prisma ^7 (or embedded PGlite) |
| UI | Tailwind CSS v4 + shadcn/ui (light/dark) |
| Auth | Auth.js v5 (credentials + SSO) |
| Email | Nodemailer SMTP + React Email templates |
| Charts | recharts |
| Tests | Vitest + Playwright |
| Deployment | Docker Compose |

Payment gateways (Stripe/SEPA/PayPal) and a REST API are the planned final phase — invoices are already shaped for them.

---

<details>
<summary><strong>Reverse Proxy Configuration</strong></summary>

The app is designed to run behind a TLS-terminating reverse proxy (Caddy, nginx, etc.). Auth.js runs with `trustHost` enabled.

**Your proxy must forward:**
- `Host` / `X-Forwarded-Host` — public hostname
- `X-Forwarded-Proto` — `https`
- `X-Forwarded-For` — client IP (for rate limiting)

**Required configuration:**
- Set `APP_URL` to your public HTTPS URL (e.g. `https://dojo.example.com`)
- Set `TRUSTED_PROXY_COUNT` to the number of trusted proxies (defaults to `0`; set to `1` behind a single proxy like Caddy/nginx)
- Do not expose port 3000 publicly — route only through the proxy
- `AUTH_URL` defaults to `APP_URL`; set explicitly only if auth must use a different origin

**Caddy** (`Caddyfile`, `TRUSTED_PROXY_COUNT=1`):
```caddy
dojo.example.com {
    reverse_proxy app:3000
}
```

**nginx** (`TRUSTED_PROXY_COUNT=1`):
```nginx
server {
    listen 443 ssl;
    server_name dojo.example.com;
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

</details>

---

## Operations

### Scheduled jobs

Jobs run inside the app by default — every five minutes, no external scheduler needed. Check **Admin → Scheduling** for the last run time; disable the built-in scheduler there if you'd rather trigger externally:

```bash
curl -H "x-cron-secret: <your CRON_SECRET from the compose file>" http://localhost:3000/api/cron/run
```

Triggers: class/payment/birthday/trial follow-up/agreement reminders, queued email campaigns, membership-hold auto-resume, recurring invoice generation, session generation, audit log pruning, email log pruning, password-reset and portal-token pruning, and the orphaned file sweep.

### Testing

Integration tests hit a real PostgreSQL database and delete/reset data. Run against a dedicated test database:

```bash
# Create and migrate the test database
docker compose exec db createdb -U mitch mitch_dojo_test
DATABASE_URL="postgresql://mitch:mitch@localhost:5432/mitch_dojo_test?schema=public" npx prisma migrate deploy

# Run tests
TEST_DATABASE_URL="postgresql://mitch:mitch@localhost:5432/mitch_dojo_test?schema=public" npm run test
npm run test:e2e    # Playwright (also needs DATABASE_URL pointed at the test database)
```

### Backup

```bash
# Database (Postgres mode)
docker exec mitch-dojo-db-1 pg_dump -U mitch mitch_dojo | gzip > dojo-$(date +%F).sql.gz

# Uploaded files (photos, attachments, logo)
docker run --rm -v mitch-dojo_app_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/dojo-files-$(date +%F).tar.gz -C /data .
```

Lite mode backs up its whole database as a volume snapshot — see the [Backups guide](docs/deployment/backups.md).

> Do not run `docker compose down -v` unless you intend to wipe data.

---

## Documentation

| Document | Description |
|----------|-------------|
| [User Documentation](docs/index.md) | VitePress site in `docs/` — user guides, configuration, deployment (`npm run docs:dev`) |
| [Architecture](ARCHITECTURE.md) | Full platform architecture, data model, and design decisions |
| [Phase Review](phasereview.md) | Remaining and potential work, tracked openly |

---

## Contributing

While I believe AI can be a powerful tool for development — and I personally use AI assistants to help manage documentation and reviews — it must remain a tool in the hands of a capable developer. In this project, **you are the pilot**; you are responsible for coding, confirming, and refining your contributions.

To help those using AI tools, I've created an [AGENTS.md](AGENTS.md) file specifically for your assistants to follow. Please ensure your agent adheres to these guidelines, as non-compliant code will be rejected regardless of how well it functions.

Most importantly, please ensure you **fully understand the code you are submitting**. A "black box" approach where AI generates code that the human contributor doesn't understand is not permitted here.

---

## License

[AGPL-3.0](LICENSE)

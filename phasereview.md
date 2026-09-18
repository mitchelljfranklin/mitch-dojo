# Phase Review — Remaining & Potential Work

> **Last updated:** September 2026 (UX/product polish batches planned and approved)
> **Purpose:** a living checklist of everything left or worth considering,
> so nothing lives only in conversation. Tick items off or strike them out
> as decisions land.

## Completed phases (reference)

| Phase | Scope |
|---|---|
| 0 | Scaffold: auth, RBAC, settings, audit, scheduler, storage, email, dual-mode DB, Docker, CI, docs |
| 1 | Students & locations (multi-location, primary dojo, CSV import/export, photos + attachments) |
| 2 | Classes & schedule (trainers, courses, weekly times, generated sessions, timetable) |
| 3 | Attendance & public QR check-in |
| 4 | Belts & gradings (per-discipline ladders, cumulative eligibility + override) |
| 5 | Historical import (attendance backfill/CSV, belt-history CSV) |
| 5b | Disciplines & global belt ranks |
| — | Student↔discipline assignment (progression lists assigned students only) |
| 6 | Memberships & payments (plans, enrollments, invoices, manual payments, overdue suspension) |
| — | Invoice location tagging (per-location revenue) |
| 7 | Communication (class/payment/birthday reminders, editable templates) |
| 8 | Analytics (attendance trend, revenue, retention, members per location) |
| 9 | Trials & leads (pipeline, public /book, follow-up emails) |
| 10 | Member portal (magic links, read-only view incl. balance) |
| 11 | White-label (org branding + logo on public/member surfaces and emails, editable booking copy) |
| — | Student address details (street/city/state/postcode/country with org default) |
| — | Email log + retry (ported from mitch-risk; dashboard failed-email chip) |
| — | Admin area restructure (sidebar regrouping; settings tabs → 15 sections in 7 groups at /admin/* with a /settings shim) |
| — | SSO + break glass (Entra ID / Google / OIDC, JIT provisioning, SSO-only mode with anti-lock-out, single-use break-glass URLs) |

---

## Phase 12 — Gateways & REST API (last planned roadmap phase)

- [ ] **Payment gateways** (Stripe / SEPA / PayPal): online invoice payment
      from the member portal, webhook handling, gateway settings encrypted
      in Settings. Deliberately deferred until a real dojo asks — manual
      payment recording covers current needs.
- [ ] **REST API + Swagger**: token-authenticated read endpoints for
      external integrations; `api:manage` permission key already exists in
      the RBAC catalog.
- [ ] **Full Docker image build test** (end-of-phases milestone): build and
      run the actual `docker-compose.yml` and `docker-compose.lite.yml`
      images end-to-end — verifying the entrypoint sequence (migrate →
      backup → seed → serve), the `pglite_backups` volume, and a container
      update path. Deferred until phases complete.

---

## Known gaps & hardening candidates (potential items)

### Data hygiene (cleanup cron jobs)

- [x] **Parity with mitch-risk confirmed** (September 2026) — mitch-risk's
      cleanup surface is {audit-log pruning, email-log pruning, orphan-file
      sweep, notification dedupe, cron.lastRun stamp}; mitch-dojo already
      implements all of it **plus** reset-token and portal-token pruning.
      No port needed. Record-level retention (e.g. anonymising old
      inactive students) remains a candidate future feature below.

### Storage

- [ ] **Live smoke-test S3 and Azure** — both providers are implemented
      (`lib/storage/s3.ts`, `lib/storage/azure.ts`) and selectable in
      Admin → Storage, but only local disk is covered by automated
      tests. Run once against real buckets/containers before pointing a
      production deployment at cloud storage.
- [ ] **"Test connection" button** on the Admin → Storage page — saves
      admins discovering a bad connection string only when the first
      upload fails. Small: initialise the client, do a HEAD/ping, report.
- [ ] **Provider migration note/tooling** — switching providers does not
      move existing files (stated in UI copy). Could add a one-click
      "copy all objects to the new provider" tool, or simply document the
      manual `aws s3 sync` / `azcopy` equivalent.

### Testing & quality

- [ ] **PGlite unit/integration coverage parity** — integration tests run
      against Postgres only; the lite runner is exercised in CI but app
      queries aren't re-run against PGlite locally. Optional: a CI job
      running the integration suite in pglite mode.
- [ ] **Coverage report** — no coverage tooling configured; add
      `vitest --coverage` to CI as an informational gate.

### UX / product polish (planned September 2026 — build in this order)

Approved plan (owner sign-off): all items, in the batch order below.

- [ ] **Batch 1 — PDFs** (needs `@react-pdf/renderer` — *not* actually a
      dependency yet, correcting an earlier note): shared branded PDF shell
      (org name + light logo + primary-colour accent) + authenticated
      `/api/.../pdf` route pattern. Then:
      - [ ] Invoice PDF — button on the invoice detail page
            (`memberships:view`): header, invoice number/dates/status,
            student, line items, payment history, balance
      - [ ] Student PDF report card — button on the student record
            (`students:view`): photo, name, rank per discipline with colour
            swatch, attendance summary + next-belt eligibility, balance
- [ ] **Batch 2 — Trial conversion enrichments**:
      - [ ] Booking confirmation email — new BOOKING template type
            (Templates page), sent by the booking action after honeypot +
            rate-limit pass; dedup key `booking:{trialId}`; toggleable in
            Admin → Communication alongside the other reminder types
            (owner decision)
      - [ ] Conversion dialog enrichment — optional plan select + "create
            first invoice" checkbox (plan pre-selected when exactly one
            active plan exists); trials store only free-text session notes,
            so no automatic plan inference
- [ ] **Batch 3 — Bulk actions on the students list**: checkbox column +
      select-all + floating action bar; bulk set status and bulk assign
      disciplines (`students:edit`), bulk enroll to plan
      (`memberships:edit`, hidden without it); one audited server action per
      operation with row-level results
- [ ] **Batch 4 — Check-in kiosk mode**: toggle on /checkin/[token] hiding
      page chrome, enlarged roster + auto-focused search, Fullscreen API
      button; persisted via `?kiosk=1`
- [ ] **Batch 5 — Trainer experience review**: audit task, not code — walk
      the seeded Trainer role through every screen, confirm nothing
      important is hidden and nothing admin-y leaks; fix findings and record
      the outcome here

### Infrastructure / operational

- [ ] **Backups documentation for Postgres mode** — the lite runbook
      (docs/deployment/backups.md) covers PGlite volume snapshots; Postgres-mode
      `pg_dump` scheduling deserves the same treatment.
- [ ] **`/api/cron/run` security review** — confirmed constant-time +
      rate-limited; a one-time penetration-style pass over public routes
      (book, portal, check-in) before go-live is cheap insurance.
- [ ] **Dependency audit + upgrade pass** — `npm audit` and minor-version
      bumps at the milestone (Next 16.x, Prisma 7.x move quickly).

### Explicitly out of scope (unchanged)

- Per-location access isolation (locations are organisational only)
- SMS/WhatsApp messaging, POS storefront, kiosk apps, native mobile
- Multi-tenancy (the platform is single-dojo by design)
- AGPL license notice removal (source notices stay regardless of
  white-labeling)

---

## Known deferred test items

- [ ] **Docker image build test** — deferred by decision to the
      end-of-phases milestone (covers both compose files, the entrypoint
      sequence, and the backups volume).
- [ ] **Admin e2e hydration waits** — the admin pages are heavy;
      the specs use `networkidle` + a short settle. If flakes reappear,
      consider making the pages lighter (stream sooner) rather
      than lengthening waits.

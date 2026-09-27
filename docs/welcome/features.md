# Features

## Students & locations

- Multi-location enrolment — students train at one or more dojo sites with exactly one **primary (home) dojo**
- Photos, attachments, guardian and emergency contacts, structured addresses with an org-wide default country
- Disciplines assignment — a student's rank lives per discipline, globally across all locations teaching it
- Statuses for the full lifecycle: trial, active, inactive, alumni; CSV import/export for migrating schools

## Classes & schedule

- Trainer roster with optional login accounts — guest instructors never need one
- Courses tied to exactly one location and one discipline, with recurring weekly training times
- Sessions auto-generated two weeks ahead, idempotently; a weekly timetable view per location
- Location moves keep attendance history intact (the location is stamped on each session)

## Attendance & QR check-in

- Attendance sheets per session: Present, Late, Excused, Absent — with bulk marking and one-click check-in
- An **attendance browser** listing every session past and upcoming with marked/trained counts, so history is always reachable
- Printable branded **attendance PDF** per session
- No-login QR check-in pages per location, secured by a revocable token
- Check-ins feed belt eligibility automatically (Present and Late both count)
- Students with overdue invoices can be suspended from check-in automatically

## Belts & gradings

- Per-discipline belt ladders — Karate and Jujitsu students progress independently
- Cumulative eligibility: every trained session across all courses of a discipline counts toward the next rank
- Threshold per belt, set once on the ladder; instructors can override for make-up gradings
- Full promotion history with denormalised names/colours so records stay readable through ladder reorganisations

## Historical import

- Per-student "add past attendance" backfill sheet (creates missing past sessions automatically)
- Attendance CSV import — idempotent, row-level errors reported, never auto-creating students or courses
- Belt-history CSV import per discipline, with backdated awards

## Memberships & payments

- Plan builder with billing periods and pricing per plan
- Enrollments, auto-generated recurring invoices (optionally tagged to a location for per-location revenue)
- Manual payment recording — cash, transfer, terminal — with a full payment history per invoice
- Overdue tracking with configurable due windows, automatic check-in suspension, and payment reminder emails

## Communication

- Scheduler-driven reminders: upcoming class, payment due/overdue, birthdays, and trial follow-ups
- Every reminder individually toggleable with its own timing window
- Editable subject/body templates with tokens, and a sample-send to test your SMTP setup
- Email log with statuses and one-click retry; failed sends surfaced on the dashboard

## Trials & member portal

- Public trial-booking page at `/book` — rate-limited and honeypot-protected, creates a trial student with a chosen class
- A lead pipeline (New → Contacted → First class → Converted/Lost) with guarded stage transitions and conversion stats
- Staff-emailed magic links (hashed tokens, 30-day expiry) to a member portal: progress, belts, upcoming classes, attendance, invoices, and balance — plus digital signing, PDF downloads, self-service contact updates, and email preferences

## Analytics

- Overview counters, weekly attendance trend with location filter, and monthly recorded revenue
- At-risk retention list surfacing students whose training has lapsed
- Members-per-location breakdown
- **Reports** — per-student attendance rate, birthdays & training anniversaries, revenue by plan with an estimated monthly recurring revenue, each exportable to CSV

## Documents & consent

- A **school-managed set of versioned agreements** — the seeded privacy
  notice, informed consent, and safety expectations are placeholders;
  add/rename/disable/delete documents under Admin → Documents. Saving an
  edit creates a new version and requires members to re-sign
- Digital signing through the member portal (confirmation + typed name, date recorded) with a staff-recorded paper fallback and printable branded forms
- **Compliance page** listing every member with an outstanding signature, plus optional scheduler reminders and an optional check-in gate
- Health & medical section on the student record (medications, conditions, injuries) gated by a dedicated PHI permission
- **Incident reports / accident book** — dated, severity-rated incidents optionally linked to a student and location, with open/closed tracking and a per-student history

## Platform

- **White-label** — your org name and logo on the booking page, member portal, check-in screens, login screens, and every email; separate light/dark logo variants so single-colour badges stay visible everywhere, with a choice of logo for emails; editable booking-page copy
- **Single sign-on** — Microsoft Entra ID, Google, or any OpenID Connect provider; first sign-ins auto-provision passwordless accounts; SSO-only mode with a single-use break-glass URL for emergencies
- **RBAC** — three seeded system roles (Admin, Trainer, Viewer) plus custom roles over 24 fine-grained permissions (incl. PHI-gated medical visibility); gated controls are hidden, never greyed out
- **Audit log** — every state-changing admin action logged, with retention pruning
- **Dual-mode database** — PostgreSQL server or embedded PGlite; one schema, one migration set, a single environment variable to switch
- **Scheduler** — built-in 5-minute job runner (reminders, pruning, orphan-file sweep) or trigger it externally via a secured cron endpoint

# Introduction

## What is Mitch‑Dojo?

Mitch‑Dojo is a lightweight, self-hosted dojo management solution for martial arts schools. It keeps your students, locations, classes, attendance, belt progressions, memberships, and communication in one place — with QR check-in at the door, automatic belt-eligibility tracking, reminder emails, a trial pipeline, and a read-only member portal for your students.

Designed with simplicity at its core, Mitch‑Dojo favours fewer, well-connected screens over sprawling configuration. Everything — branding, SMTP, storage backends, roles, retention, and the rest — is managed through an intuitive in-app Admin area. No YAML config files, no Kubernetes manifests, no professional services engagement.

Deploy via Docker Compose behind a reverse proxy and you're running in minutes. Two deployment modes share one database schema: a classic app + PostgreSQL stack for production, or a single container with an embedded PostgreSQL (PGlite) for a Raspberry Pi or a small VPS.

## White-label by default

Mitch‑Dojo is built to look like **your school**, not like the software vendor. Your organization name, logos, colours, layout, booking copy, email identity, and PDF headers are runtime settings in the Admin area — no theme files to edit and no rebuild.

- **Name and logo** — set your school name under [General](../configuration/general) and your light/dark logos under [Appearance](../configuration/appearance). They appear on the booking page, member portal, check-in screens, login screens, staff UI, emails, and generated PDFs.
- **Colours and layout** — choose primary/secondary colours, corner radius, and content width for the staff UI. Brand colours apply to the light theme; dark mode keeps its contrast-tuned palette.
- **Emails** — set the From name/address under [Email](../configuration/email), choose the email logo under Appearance, and write the subject/body copy under [Templates](../configuration/templates).
- **Your words** — replace the public booking headline and description; authored templates, agreement documents, and names stay exactly as written.
- **Your domain** — point a custom domain at the deployment and set `APP_URL`; TLS and host routing are handled by your reverse proxy.

This is **controlled white-labeling**, not arbitrary CSS/HTML injection. The source repository and documentation remain Mitch‑Dojo, and the AGPL-3.0 license still applies.

## Why Mitch‑Dojo exists

Dojo management is a real operational problem — but a small one. Commercial platforms like Zen Planner, Kicksite, and Clubworx sell subscriptions per member, lock your data behind their dashboards, and carry feature sets aimed at multi-location fitness franchises.

Mitch‑Dojo strips it back to what a single school actually needs: know who is training, when, and how far they have progressed. Record attendance, track belts, bill memberships, remind people about class, and give families a portal to check progress and balance. Your data stays in your database, exportable to CSV at any time, under an open-source license with no per-member fees.

It is built to be managed by the instructor or office manager — not an IT department. If you can run a spreadsheet, you can run Mitch‑Dojo.

## What Mitch‑Dojo is not

Mitch‑Dojo does not aim to replace franchise-scale platforms. It is deliberately single-dojo (multi-location, one tenant), records payments manually rather than processing them (gateways are a later phase), and skips the extras that sound good in demos but never get used — SMS marketing, funnel builders, POS storefronts, native mobile apps.

It is open-source (AGPL-3.0), self-hosted, and yours. If that sounds like your reality, you are in the right place.

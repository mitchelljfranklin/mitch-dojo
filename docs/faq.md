# FAQ

Quick answers to the questions that come up most.

**Is Mitch‑Dojo really free?**
Yes — AGPL-3.0 open source, self-hosted, no per-member fees. You pay for whatever hardware you run it on.

**How many dojos can I run?**
One school per instance, by design — but with multiple **locations**. A second school means a second instance; keeping tenants separate is what keeps the data model simple.

**Can students check themselves in?**
Yes — each location gets a no-login QR check-in page. Tokens are revocable if a QR leaks.

**Does it send SMS or WhatsApp?**
No, deliberately. Email only — see the out-of-scope list in the [introduction](./welcome/introduction).

**Can parents see progress?**
Yes — send a [member portal](./user-guides/member-portal) magic link (30-day expiry, hashed tokens). The portal shows belts, upcoming classes, attendance, balance, and their consent documents, and lets them sign agreements, download invoices/agreements, update their contact details, and set email preferences.

**Do you handle waivers, consent forms, and medical info?**
Yes — the school's agreement documents (privacy notice, informed consent, safety expectations, or your own set) are versioned in Admin → Documents and signed digitally through the portal or recorded from paper. Health/medical notes live on the student record behind a dedicated PHI permission — see [Documents & Consent](./user-guides/compliance).

**Can I take payments online?**
Not yet. Payments are recorded manually (cash/transfer/terminal). Stripe/SEPA/PayPal gateways are the planned Phase 12 — the invoice model is already shaped for them.

**How do I migrate from a spreadsheet?**
CSV. Import students first, then attendance and belt history — see [Importing History](./user-guides/importing-history). Everything exports back out to CSV too.

**Can I use Mitch‑Dojo in another language?**
Yes. English, Spanish, Portuguese, French, German, Italian, Japanese, Korean, Chinese, Arabic, Hindi, and Russian ship today. Set the school-wide default in [Admin → General](./configuration/general), or switch language per device with the header selector. The ten languages added after English/Spanish are initial machine-assisted translations, so native review is welcome. PDFs bundle Noto fonts; Arabic/Hindi shaping and Arabic RTL are best-effort. See [Adding a Language](./advanced/adding-a-language) for adding another one.

**What if I outgrow the embedded database?**
Switch `DATABASE_PROVIDER` to `postgres` — the schema is identical in both modes. See [Dual-Mode Database](./advanced/dual-mode-database).

**How is my data backed up?**
You own it: Postgres dumps or PGlite volume snapshots, plus the file-storage mount. Recipes in [Backups](./deployment/backups).

**Can I white-label it as my school?**
Yes — this is a white-label solution, not a fixed-brand product. Set your organization name under [Admin → General](./configuration/general); set light/dark logos, primary/secondary colours, radius, page width, and booking headline/description under [Admin → Appearance](./configuration/appearance). Under [Admin → Email](./configuration/email) set your From name/address and choose the email logo. Those settings show up on the staff UI, login screens, booking page, member portal, check-in screens, emails, and generated PDFs. A custom domain is configured at the reverse proxy/deployment layer (`APP_URL`), not in the app. The documentation site and source repository remain Mitch‑Dojo, and the AGPL-3.0 license still applies.

**Can two instructors use it at once?**
Yes — that's what [roles](./user-guides/rbac) are for. Give trainers the seeded Trainer role; they see floor operations, not administration.

**Does it work on a Raspberry Pi?**
Yes — that's what [Lite mode](./deployment/lite) is for: one container, embedded PostgreSQL, SD-card-friendly backup recipes included.

**What happens to my data if I stop using Mitch‑Dojo?**
It's yours, in a standard Postgres database plus ordinary files on disk. Export to CSV any time; no lock-in, no export fees.

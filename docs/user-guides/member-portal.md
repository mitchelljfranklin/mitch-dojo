# Member Portal

A self-service portal where students and parents check their own progress — no login, no password to forget. They can sign agreements, download documents, and keep their contact details current.

## How access works

1. Staff open a student's record and send a **portal link** (requires `students:edit`).
2. The student receives an email (to their address, falling back to the guardian) with a personal link.
3. The link opens `/portal` — no login. Tokens are **hashed in the database** and expire after **30 days**.
4. Ask for a new link any time — staff can send a fresh one; expired tokens are pruned automatically by the scheduler.

A **household** can also be sent one link (Students → Households → *Email portal link*): it shows **every child** in the family, with a switcher between them.

::: warning Links are secrets
Anyone with the link can see that student's data. Tokens are scoped to one student (or a household's children), expire after 30 days, and are stored hashed so they can't be recovered from a database dump — only re-issued.
:::

## What students see

| Section | Contents |
|---|---|
| **Progress** | Current belt per discipline, promotion history, next-belt eligibility |
| **Upcoming classes** | Their courses' next sessions, plus an **Add classes to calendar** `.ics` download |
| **Attendance** | Recent attendance history |
| **Invoices & balance** | Their invoices and current balance |
| **Documents & consent** | Read and digitally sign the school's agreements ([Compliance](./compliance)) |
| **Your details** | Update their own contact details and email preferences (see below) |

The portal lets the member edit only their **own contact details** — email, phone, address, emergency contact, and guardian details — plus their **email preference**. Identity fields (name, date of birth, status, photo, medical) and everything else (progress, invoices) stay staff-managed. Contact edits and preference changes are **audit-logged** and rate-limited; the portal token is re-checked server-side on every write.

Members can also **download PDFs** of their own invoices and agreements from the portal. Downloads are token-authorized: a token can only fetch documents belonging to a student it grants.

## Email preferences

Members can tick **Pause non-essential emails** to opt out of class reminders, birthday emails, trial follow-ups, and agreement reminders. **Payment reminders and account emails are always sent** (they're transactional), and staff-side notifications (e.g. new-booking alerts) are unaffected.

## White-labeling

The portal, the [booking page](./trials), and check-in screens all share your branding from [Admin → Appearance](../configuration/appearance) — logo, colours, and org name.

## Templates

The portal-link email is a template with `{{studentName}}`, `{{portalUrl}}`, and `{{expiryDays}}` tokens — edit it under Admin → Templates. Retry a failed portal-link send from the [Email Log](../configuration/email-log); the retry issues a **fresh** link (old tokens stay valid until expiry).

# Email Log

Every email the platform sends, with delivery status and one-click retry.

## What's logged

Each send writes a row with: type, recipient, subject, status (`SENT` / `FAILED`), and timestamps. Failed rows include the underlying SMTP error. Filter by type, status, and date.

The dashboard shows a **failed-emails chip** when recent sends failed, linking here.

## Retry

Failed sends get a **Retry** action (`settings:manage`):

- Tokens are regenerated from **current data** — a retried class reminder uses the session's latest time; a retried portal-link email issues a fresh magic link.
- The retry is recorded against the same log row, so the history stays in one place.
- Password-reset emails are **never** retried — reset links are single-use by design.

## Retention

| Setting | Default | Notes |
|---|---|---|
| **Email log retention** | 14 days | 0 keeps rows forever; pruned by the scheduler |

Permissions: view with `audit:view`; retry and change retention with `settings:manage`.

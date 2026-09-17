# Cron & Scheduler

How background work gets done — the built-in runner, or your own cron.

## Two ways to run

| Mode | How | When to choose |
|---|---|---|
| **Built-in scheduler** (default) | `lib/scheduler.ts`, started by `instrumentation.ts` | Default; nothing to configure |
| **External trigger** | `GET /api/cron/run` with `x-cron-secret` | Platforms that sleep/scale to zero, or centralised cron |

Toggle under [Admin → Scheduling](../configuration/scheduling). Both modes run the identical job set.

## Job inventory (every 5 minutes)

| Job | Detail |
|---|---|
| **Reminder pass** | Class reminders (hours-before window), payment reminders (due-soon + overdue), birthday emails (day-of), trial follow-ups (per open trial past the window) |
| **Invoice generation** | Recurring invoices for active enrollments, due date from settings |
| **Audit-log pruning** | Entries older than the audit retention (default: keep forever) |
| **Email-log pruning** | Rows older than the email-log retention (default 14 days) |
| **Password-reset token pruning** | Expired single-use reset tokens |
| **Portal-token pruning** | Expired member-portal magic links (30-day lifetime) |
| **Orphaned-file sweep** | Deletes storage files not referenced by any record (photos, attachments, logo) |

Not on the clock: **session generation** for the timetable happens on view (schedule or course page open), 14 days ahead, idempotently.

## Deduplication contract

Every email send writes a `NotificationLog` row with a dedup key. Repeated ticks, restarts, or overlapping triggers never re-send the same reminder — and when SMTP is unconfigured, the pass bails **before** sending, so keys are never burned by a broken configuration. Retries (from the email log) deliberately regenerate tokens and re-use the same log row.

## External trigger details

```bash
curl -H "x-cron-secret: $CRON_SECRET" https://your-dojo.example.com/api/cron/run
```

- The secret is **required in production** (the app refuses to boot without it) and compared in constant time.
- The endpoint is rate-limited.
- Every 5 minutes matches the internal cadence; more often is harmless (idempotent), less often delays reminders.

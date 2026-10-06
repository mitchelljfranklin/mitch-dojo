# Cron & Scheduler

How background work gets done — the built-in runner, or your own cron.

## Two ways to run

| Mode | How | When to choose |
|---|---|---|
| **Built-in scheduler** (default) | `lib/scheduler.ts`, started by `instrumentation.ts` | Default; nothing to configure |
| **External trigger** | `GET /api/cron/run` with `x-cron-secret` | Platforms that sleep/scale to zero, or centralised cron |

Toggle under [Admin → Scheduling](../configuration/scheduling). Both modes run the identical job set. The built-in scheduler runs once at boot and then every five minutes, so a restart doesn't wait a full interval for the first pass (set `SCHEDULER_RUN_ON_BOOT=false` to skip it).

## Job inventory (every 5 minutes)

| Job | Detail |
|---|---|
| **Reminder pass** | Class reminders (hours-before window), payment reminders (due-soon + overdue), birthday emails (day-of), trial follow-ups (after the booked class), agreement reminders (outstanding documents), verification reminders (expiring/expired credentials, weekly until renewed) |
| **Invoice generation** | Recurring invoices for active enrollments, due date from settings. Attendance-gated plans (`chargeOnlyWithAttendance`) skip a cycle when the member hasn't trained since the previous invoice; the run result carries `generatedInvoices` and `skippedInvoices` |
| **Membership hold auto-resume** | Paused enrollments whose resume date has arrived |
| **Queued campaigns** | Drained in batches (25 recipients per campaign, up to 500 per tick) |
| **Audit-log pruning** | Entries older than the audit retention (default: keep forever) |
| **Email-log pruning** | Rows older than the email-log retention (default 14 days) |
| **Password-reset token pruning** | Expired single-use reset tokens |
| **Portal-token pruning** | Expired member-portal magic links (30-day lifetime) |
| **Orphaned-file sweep** | Deletes storage files not referenced by any record (photos, attachments, logo) |

Session generation for the timetable runs **on the clock and on view**: the scheduler generates the next 14 days every tick (so a kiosk-only dojo whose staff never open the schedule still has sessions), and the schedule/course pages generate on open for immediacy. Idempotent either way.

## Deduplication contract

Every email send writes a `NotificationLog` row with a dedup key. Repeated ticks, restarts, or overlapping triggers never re-send the same reminder — and when SMTP is unconfigured, the pass bails **before** sending, so keys are never burned by a broken configuration. Retries (from the email log) deliberately regenerate tokens and re-use the same log row.

Each reminder job also caps how many emails it sends **per tick** (50), so a large dojo can't outrun the 5-minute interval; anything left carries no dedup row and is picked up on the next tick.

## External trigger details

```bash
curl -H "x-cron-secret: <your CRON_SECRET from the compose file>" https://your-dojo.example.com/api/cron/run
```

- The secret is **required in production** (the app refuses to boot without it) and compared in constant time.
- The endpoint is rate-limited.
- Every 5 minutes matches the internal cadence; more often is harmless (idempotent), less often delays reminders.

# Scheduling

The built-in job runner that keeps the platform ticking.

## What runs

Every **5 minutes** (Node runtime only — never on edge):

| Job | Purpose |
|---|---|
| **Reminders** | Class, payment, birthday, trial follow-up emails ([Communication](./communication)) |
| **Invoice generation** | Recurring invoices for active enrollments ([Memberships](./memberships)). Plans marked **Charge only with attendance** generate only when the member has trained since the previous invoice — skipped cycles are reported in the run result. |
| **Retention pruning** | Audit log and email log per their retention settings |
| **Token pruning** | Expired password-reset and portal-link tokens |
| **Orphan-file sweep** | Deletes storage files no longer referenced by any record |

Session generation for the timetable happens on view (whenever the schedule or a course page is opened) rather than on the clock.

## Controls

| Setting | Default | Notes |
|---|---|---|
| **Internal scheduler** | on | Turn off to drive jobs externally |

The page also shows the **last scheduled run** so you can confirm the loop is alive.

## External trigger

For container platforms that sleep, or to consolidate scheduling, disable the internal runner and hit the endpoint on your own cron:

```bash
curl -H "x-cron-secret: <your CRON_SECRET from the compose file>" https://your-dojo.example.com/api/cron/run
```

- The secret is required in production and compared in **constant time**; the endpoint is rate-limited.
- Every 5 minutes matches the internal cadence. Idempotent by design — repeated triggers never double-send ([dedup](./communication#deduplication)).

See [Cron & Scheduler](../advanced/cron) for the full job reference.

Requires `settings:manage`. Changes are audited.

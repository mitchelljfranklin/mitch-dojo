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
| **Session generation** | Keeps the next 14 days of class sessions present, so check-in and attendance always have rows even if nobody opens the schedule |

Session generation also runs on view (opening the schedule or a course page) for immediacy — both paths are idempotent.

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

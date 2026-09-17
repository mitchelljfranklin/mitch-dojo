# Communication

Scheduler-driven emails that go out on their own, plus the log that keeps you honest about what was sent.

## Reminder types

| Type | Trigger | Default |
|---|---|---|
| **Class reminder** | Hours before a session, to students who train that course's discipline | On, 24h before |
| **Payment reminder** | Once when an invoice enters the due-soon window; once more after N days overdue | On, 3 days before due / 7 days overdue |
| **Birthday email** | On the day (Feb 29 birthdays only in leap years) | On |
| **Trial follow-up** | One email per open trial after N days in the pipeline without converting | On, after 3 days |

Each type is individually toggleable with its own timing window under **Admin → Communication**. Subjects and bodies are editable under **Admin → Templates**, with a sample-send to test delivery — see [Templates](../configuration/templates).

## Recipients

Emails go to the student's address, falling back to the **guardian** when the student has none. Students with neither are skipped — they also can't use the member portal.

## Deduplication

Every send writes a log row whose key enforces **once-per-period** semantics: a repeated scheduler tick, a restart, or a re-run never sends the same reminder twice. When SMTP isn't configured, the whole pass bails out before sending so keys are never burned by a broken configuration.

## The email log

**Admin → Email log** shows every send — type, recipient, subject, status (`SENT` / `FAILED`), and timestamps. Failed sends include the error message, and the dashboard shows a chip when recent sends failed.

- **Retry** — re-send a failed email with one click. Tokens are regenerated from current data, so a retried class reminder reflects the session's latest time.
- **Retention** — log rows are pruned by the scheduler (default 14 days; see [Email Log](../configuration/email-log)).

## Permissions

| Action | Permission |
|---|---|
| View email log | `audit:view` |
| Retry sends, manage reminder settings | `settings:manage` |

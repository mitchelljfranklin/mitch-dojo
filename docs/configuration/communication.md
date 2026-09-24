# Communication

Reminder timing and toggles. Subjects/bodies live on the [Templates](./templates) page; the results on the [Email log](./email-log).

## Reminder settings

| Setting | Default | Range |
|---|---|---|
| **Class reminders** | on | Hours before class: 24 (1–48) |
| **Payment reminders** | on | Days before due: 3 (0–30); overdue reminder after 7 days (1–90) |
| **Birthday emails** | on | On the day (Feb 29 birthdays only in leap years) |
| **Trial follow-ups** | on | Days after a trial joins the pipeline: 3 (1–60) |
| **Booking confirmations** | on | Sent the moment a public booking creates a trial |
| **New booking alerts (staff)** | on | One alert per listed recipient; recipients start empty |

## Behaviour notes

- **Class reminders** target ACTIVE/TRIAL students who train the course's discipline at the session's location — the same population that checks in.
- **Payment reminders** fire once per invoice per phase (due-soon, overdue) — never repeatedly.
- **Trial follow-ups** fire once per open trial; converted or lost trials never get one.
- **Booking confirmations** fire once per booking, to the prospect's email only (deduped; a duplicate submission never re-sends).
- **New booking alerts** go to every configured staff recipient whenever a public booking creates a trial (deduped per booking). Enter comma-separated addresses under Communication settings — alerts begin once at least one is saved; the [Trials sidebar badge](../user-guides/trials) is the in-app signal.
- All sends respect the student → guardian fallback and skip students with no email at all.
- Every send is logged (see [Email log](./email-log)); when SMTP is unconfigured the pass bails before sending so dedup keys are never burned.

Requires `settings:manage`. Changes are audited.

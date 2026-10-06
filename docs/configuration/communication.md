# Communication

Reminder timing and toggles. Subjects/bodies live on the [Templates](./templates) page; the results on the [Email log](./email-log).

## Campaigns (bulk email)

**Admin → Email → Campaigns** sends a one-off message to a group — dojo closures, grading notices, event reminders. Compose a subject and a Markdown message, choose an audience (**all active members**, a **location**, a **discipline**, a **course**, or members with an **overdue balance**), and queue it.

- The recipient list is resolved with the student → guardian email fallback and **deduplicated**, so siblings sharing a guardian address get one copy.
- Campaigns are **queued** and delivered by the scheduler in batches (within a few minutes), so a large list never blocks the app. Per-recipient delivery and failures show in the [Email log](./email-log).
- Requires `communications:edit`. Queuing is audited.

## Reminder settings

| Setting | Default | Range |
|---|---|---|
| **Class reminders** | on | Hours before class: 24 (1–48) |
| **Payment reminders** | on | Days before due: 3 (0–30); overdue reminder after 7 days (1–90) |
| **Birthday emails** | on | On the day (Feb 29 birthdays only in leap years) |
| **Trial follow-ups** | on | Days after the booked trial class (or pipeline join for walk-ins): 3 (1–60) |
| **Booking confirmations** | on | Sent the moment a public booking creates a trial |
| **New booking alerts (staff)** | on | One alert per listed recipient; recipients start empty |
| **Agreement reminders** | on | One email per student per unsigned or out-of-date agreement (version-keyed) |
| **Verification reminders** | on | One email per trainer per expiring/expired credential; days before expiry: 60 (1–365) |

## Behaviour notes

- **Class reminders** target ACTIVE/TRIAL students who train the course's discipline at the session's location — the same population that checks in.
- **Payment reminders** fire once per invoice per phase (due-soon, overdue) — never repeatedly.
- **Trial follow-ups** fire once per open trial; converted or lost trials never get one. The window counts from the class the prospect booked, falling back to the pipeline join date for walk-ins — so a follow-up is never sent before the booked trial class.
- **Booking confirmations** fire once per booking, to the prospect's email only (deduped; a duplicate submission never re-sends).
- **New booking alerts** go to every configured staff recipient whenever a public booking creates a trial (deduped per booking). Enter comma-separated addresses under Communication settings — alerts begin once at least one is saved; the [Trials sidebar badge](../user-guides/trials) is the in-app signal.
- **Agreement reminders** fire once per student per outstanding document version. Editing a document to a new version re-arms the reminder; see [Documents & Consent](../user-guides/compliance).
- All sends respect the student → guardian fallback and skip students with no email at all.
- Every send is logged (see [Email log](./email-log)); when SMTP is unconfigured the pass bails before sending so dedup keys are never burned.

Requires `settings:manage`. Changes are audited.

# Trials & Leads

Turn website visitors and walk-ins into trials, then manage them to conversion.

## The public booking page

Your school gets a public trial-booking page at `/book`:

- **No login** — prospects pick a class, enter their details, and submit.
- **For yourself or a child** — a dropdown at the top. In **child mode** the contact fields relabel as *Guardian email/phone* (with an optional guardian name and **relationship to child**), and the entered contact is stored on **both** the child and the guardian — so reminders and portal links reach the family either way, and staff see the guardian (and their relationship) on the record.
- **Branded** — your org name, logo, colours, and editable headline/description ([Appearance](../configuration/appearance)).
- **Protected** — rate-limited per IP with a honeypot field against bots.
- **Only trial-bookable classes appear** — each weekly training slot on a course has a **Trial bookable** checkbox (on by default). Untick it for classes that shouldn't take new starters (senior-only sessions, for example) and they disappear from the booking page immediately.
- Booking creates a `TRIAL` student with the chosen class and lands in the pipeline.

Staff see the booking; the prospect receives a [confirmation email](#booking-confirmations). Follow up by phone or reply manually.

## The pipeline

Open **Trials** to manage leads through five stages:

```
New → Contacted → First class → Converted / Lost
```

- **Guarded transitions** — a trial can't skip stages (no New → Converted), keeping the data meaningful for conversion stats.
- **Stage actions** — record first-class attendance, convert (flips the student to `ACTIVE` with a conversion timestamp), or mark lost.
- **Conversion stats** — the pipeline header shows how trials are moving.

## Follow-up emails

Trials that sit too long without converting get one automated follow-up (default: after 3 days; toggle and window under [Communication settings](../configuration/communication), template under [Templates](../configuration/templates)).

## From trial to member

Conversion happens at the **First class** stage (guarded transitions keep the pipeline meaningful):

- **Dropdown path** — move the lead to Converted; the student flips to ACTIVE with a conversion timestamp.
- **Convert sheet** — the **Convert** button on a First-class row opens a richer flow: optionally enroll the new member into a plan and create their **first invoice** in the same step (standard due window). Requires `memberships:edit`; without it the sheet converts plainly.

Conversion makes the student active — their attendance, belts, and invoices flow into everything else (eligibility, reminders, portal).

## Booking confirmations

When a prospect books on the public page, they receive a branded **confirmation email** (toggleable under [Communication settings](../configuration/communication), template under [Templates](../configuration/templates)). One email per booking — deduped.

## Permissions

Trials reuse the students permissions: `students:view` to see the pipeline, `students:edit` to work it.

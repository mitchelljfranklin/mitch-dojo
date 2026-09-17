# Trials & Leads

Turn website visitors and walk-ins into trials, then manage them to conversion.

## The public booking page

Your school gets a public trial-booking page at `/book`:

- **No login** — prospects pick a class, enter their details, and submit.
- **Branded** — your org name, logo, colours, and editable headline/description ([Appearance](../configuration/appearance)).
- **Protected** — rate-limited per IP with a honeypot field against bots.
- Booking creates a `TRIAL` student with the chosen class and lands in the pipeline.

Staff see the booking; the prospect receives no automatic confirmation (emailing them is a candidate backlog item). Follow up by phone or reply manually.

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

Conversion from the pipeline makes the student active — their attendance, belts, and invoices flow into everything else (eligibility, reminders, portal). Or convert from the student record directly.

## Permissions

Trials reuse the students permissions: `students:view` to see the pipeline, `students:edit` to work it.

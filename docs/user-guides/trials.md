# Trials & Leads

Turn website visitors and walk-ins into trials, then manage them to conversion.

## The public booking page

Your school gets a public trial-booking page at `/book`:

- **No login** — prospects pick a class, enter their details, and submit.
- **For yourself or a child** — a dropdown at the top. In **child mode** the contact fields relabel as *Guardian email/phone* (with an optional guardian name and **relationship to child**), and the entered contact is stored on the child's **guardian fields** — so reminders and portal links reach the family, and staff see the guardian (and their relationship) on the record. One guardian email can book **several children**; only booking the same child twice is flagged as a duplicate.
- **Branded** — your org name, logo, colours, and editable headline/description ([Appearance](../configuration/appearance)).
- **Multilingual** — the booking page and form ship in twelve languages (English, Spanish, Portuguese, French, German, Italian, Japanese, Korean, Chinese, Arabic, Hindi, and Russian); visitors switch language from the selector in the header, and the choice is remembered in a cookie. The initial language is the school's **Default language** ([General settings](../configuration/general)). Switching keeps anything already typed or selected in the form. The dojo-written headline and description stay exactly as entered.
- **Protected** — rate-limited per IP with a honeypot field against bots.
- **Only trial-bookable classes appear** — each weekly training slot on a course has a **Trial bookable** checkbox (on by default). Untick it for classes that shouldn't take new starters (senior-only sessions, for example) and they disappear from the booking page immediately.
- **Capacity per slot** — a weekly slot can optionally cap how many trials may book onto it. Once full, the class shows as **(full)** and can't be selected; converting or rejecting a trial frees the spot. Leave the capacity blank for unlimited.
- **Upcoming classes only** — the booking page lists sessions for the next two weeks and drops any of today's classes that have already started.
- Booking creates a `TRIAL` student with the chosen class and lands in the pipeline.

Staff see the booking; the prospect receives a [confirmation email](#booking-confirmations). Staff with configured addresses receive a **new-booking alert email** (toggle + recipients under [Communication settings](../configuration/communication), template under [Templates](../configuration/templates)) — and the **Trials sidebar item shows a badge** with the number of NEW-stage trials, so a fresh booking is visible from anywhere in the app. Follow up by phone or reply manually.

## The pipeline

Open **Trials** to manage leads through five stages:

```
New → Contacted → First class → Converted / Lost
```

- **Guarded transitions** — a trial can't skip stages (no New → Converted), keeping the data meaningful for conversion stats.
- **Stage actions** — record first-class attendance, convert (flips the student to `ACTIVE` with a conversion timestamp), or mark lost.
- **Conversion stats** — the pipeline header shows how trials are moving.

## Follow-up emails

Trials that sit too long without converting get one automated follow-up (default: after 3 days; toggle and window under [Communication settings](../configuration/communication), template under [Templates](../configuration/templates)). The countdown starts from the **class the prospect booked** — so the email lands after their trial, not a few days after they submitted the booking. Walk-ins and manually created trials, which have no booked class, count from the day they joined the pipeline.

## From trial to member

Conversion happens at the **First class** stage (guarded transitions keep the pipeline meaningful):

- **Dropdown path** — move the lead to Converted; the student flips to ACTIVE with a conversion timestamp.
- **Convert sheet** — the **Convert** button on a First-class row opens a richer flow: optionally enroll the new member into a plan and create their **first invoice** in the same step (standard due window). Requires `memberships:edit`; without it the sheet converts plainly.

Conversion makes the student active — their attendance, belts, and invoices flow into everything else (eligibility, reminders, portal).

## Booking confirmations

When a prospect books on the public page, they receive a branded **confirmation email** (toggleable under [Communication settings](../configuration/communication), template under [Templates](../configuration/templates)). One email per booking — deduped.

## Permissions

Trials reuse the students permissions: `students:view` to see the pipeline, `students:edit` to work it.

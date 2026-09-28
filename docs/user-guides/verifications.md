# Trainer Verifications

Track the credentials your instructors need — a working-with-children check (Blue Card / WWCC), first-aid certificate, coaching accreditation, insurance, and anything else. The feature is **fully school-managed**: you define the types, so the same set works in any state or country. Nothing is hard-coded.

## Set up the types (Admin)

Under **Admin → Verifications** (`settings:manage`) add a **type** for each credential you want to track:

| Field | Meaning |
|---|---|
| **Name** | What it's called in your jurisdiction, e.g. "Working with Children Check" |
| **Description** | Optional helper text |
| **Default validity (months)** | Optional; quick reference when recording |
| **Required for all trainers** | Counts towards "missing" for every trainer |
| **Records should carry an expiry date** | Reminder hint |
| **Active** | Inactive types are hidden from trainer records |

Types with records against them can be **disabled** but not deleted — disable to retire a type without losing history.

## Record a verification (Trainers)

Open **Trainers**, click a trainer, and use the **Verifications** section on their card. Each active type shows its status; click **Record** (or **Edit**) to enter:

- **Reference / number** (e.g. the card number)
- **Issued** and **Expires** dates
- **Document** — a scanned card or certificate (PDF/PNG/JPG; replaces any previous file)
- **Notes**

One current record is kept per type; renewing overwrites it, and the [audit log](../configuration/audit) preserves the change history. The Trainers list shows a badge when a trainer has an **expired**, **expiring**, or **missing** required credential.

## Status

Status is computed from the expiry date, never stored, so it can't drift:

| Status | Meaning |
|---|---|
| **Valid** | No expiry, or expiry in the future |
| **Expiring soon** | Within the reminder window (default 60 days) |
| **Expired** | Past the expiry date |
| **Not recorded** | No record for an active type |

## Reminders

Under **Admin → Communication** enable **Verification reminders** and set how many days before expiry to remind. The scheduler emails the **trainer** (their Trainers-page email) once per credential per expiry date; recording a renewal with a new expiry re-arms it. The email copy is editable under [Admin → Templates](../configuration/templates) (`{{trainerName}}`, `{{verificationName}}`, `{{expiryDate}}`, `{{appName}}`).

## Permissions

Trainer records use the existing class permissions — `classes:view` to see them, `classes:edit` to record/remove. Managing the **types** lives in the Admin area behind `settings:manage`.

# Students

The students list is the heart of Mitch‑Dojo — everyone who trains (or has trained) at your school.

## Student record

Each student has:

- **Identity** — first/last name, email, phone, date of birth, structured address (line, city, state, postcode, country)
- **Photo** — shown on the record, attendance sheets, and progression pages
- **Contacts** — guardian (name, email, phone, and their **relationship** to the student) and emergency contact; emails fall back to the guardian when the student has no address
- **Status** — `TRIAL` → `ACTIVE` → `INACTIVE` / `ALUMNI`
- **Disciplines** — at least one (e.g. Karate, Jujitsu); progression tables only show discipline-assigned students
- **Locations** — one or more, with exactly one **primary (home) dojo** used for reporting and eligibility
- **Attachments** — documents (PDF, images, Word, Excel by default; limits in [Storage](../configuration/storage))

## The list view

Search by name or email, filter by status and location, and sort by name. Open a student for the full record: attendance history, belt progression, invoices, and attachments on one page — plus a **Report card** button that downloads a branded PDF (rank per discipline, training summary, balance) for handing to parents.

## Bulk actions

With `students:edit`, the list gains checkboxes and a floating action bar for working in batches:

- **Set status** — move many students between trial/active/inactive/alumni at once
- **Assign discipline** — link a discipline to every selected student (existing links are kept)
- **Enroll in plan** — enroll the selection into a membership plan (requires `memberships:edit`)

Every action is audit-logged as one entry with the affected students; the bar reports what changed ("Set 2 students to Trial") and the selection clears on success.

## Adding students

1. Click **Add student**.
2. Fill in identity, contacts, and address.
3. Pick the student's disciplines and locations (mark the primary dojo).
4. Save — you land on the student's page with a confirmation toast.

Bulk onboarding: see [Importing History](./importing-history) for the CSV import.

## Editing & lifecycle

- **Edit** any section from the student's page; saving returns you there with the changes applied.
- **Status changes** reflect the lifecycle: trial students convert to active (from the [trial pipeline](./trials)), inactive students keep their history, alumni are graduated/past members.
- **Deleting** a student removes their photo and attachments from storage and is permanent. Prefer `INACTIVE` for students who simply stop training.

::: tip Files are cleaned up
Deleting a student removes their photo and attachments from the storage backend — no orphans left behind. A scheduled sweep catches anything that slips through.
:::

## Households

**Households** (sidebar → People, under Students) groups siblings under one family contact (name, email, phone). Click **New household** to add one. Assign a student to a household from their **Edit** form; when you do, any **blank** guardian details are inherited from the household, so a new sibling picks up the family contact automatically. The student record shows the household and its other members. Deleting a household leaves the student records intact (they simply become unassigned).

**Email portal link** on a household sends one login that shows **every child** in the family (switch between them in the portal). Family-level invoicing remains per student for now.

## CSV import & export

- **Export** — download the current list as CSV (all fields, including address and disciplines).
- **Import** — upload a CSV to create or update students; row-level errors are reported and nothing is silently skipped. See [Importing History](./importing-history).

## Permissions

| Action | Permission |
|---|---|
| View students | `students:view` |
| Create (and CSV import) | `students:create` |
| Edit | `students:edit` |
| Delete | `students:delete` |

# Students

The students list is the heart of Mitch‑Dojo — everyone who trains (or has trained) at your school.

## Student record

Each student has:

- **Identity** — first/last name, email, phone, date of birth, structured address (line, city, state, postcode, country)
- **Photo** — shown on the record, attendance sheets, and progression pages
- **Contacts** — guardian (name, email, phone) and emergency contact; emails fall back to the guardian when the student has no address
- **Status** — `TRIAL` → `ACTIVE` → `INACTIVE` / `ALUMNI`
- **Disciplines** — at least one (e.g. Karate, Jujitsu); progression tables only show discipline-assigned students
- **Locations** — one or more, with exactly one **primary (home) dojo** used for reporting and eligibility
- **Attachments** — documents (PDF, images, Word, Excel by default; limits in [Storage](../configuration/storage))

## The list view

Search by name or email, filter by status and location, and sort by name. Open a student for the full record: attendance history, belt progression, invoices, and attachments on one page.

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

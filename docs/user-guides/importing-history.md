# Importing History

Migrating schools bring their history in three ways. All imports are **idempotent** — re-running them never duplicates records — and report row-level errors rather than guessing.

## 1. Per-student backfill

For one-off gaps: on a student's page, use **Add past attendance**. Pick the course, date, and status — if the session doesn't exist yet it's created automatically (as a past session on the course's weekly slot).

## 2. Attendance CSV import

Bulk-import past attendance. Long format — one row per student per session:

```csv
Date, Course, Email, Status
2024-02-05, Kids Karate, jane@example.com, PRESENT
2024-02-05, Kids Karate, "Sam Carter; Alex Kim", LATE
```

- **Course** must match an existing course name.
- **Student** by email, or multiple names separated by `;` (matched by name).
- **Status** is `PRESENT`, `LATE`, `EXCUSED`, or `ABSENT`.
- Missing past sessions are created automatically; already-recorded rows are skipped.
- Unknown courses or students are reported as row errors — nothing is auto-created.

## 3. Belt history CSV import

Backfill earned belts, per discipline (the ladder must exist first):

- Creates backdated promotion records for each student.
- Same-day duplicates are skipped.
- Belts that don't exist on the discipline's ladder are row errors — create them first on the ladder page.

## Order of operations

1. Import/create **students** (CSV or one by one).
2. Create **disciplines and belt ladders**.
3. Create **courses** (they must exist for attendance import).
4. Import **attendance**.
5. Import **belt history**.

Because eligibility counts all-time attendance, importing attendance before belts means every imported session immediately counts toward promotion thresholds.

## Exporting

Everything imports out again: students (full CSV incl. address and disciplines), attendance, and belt history all have CSV exports for backup or migration.

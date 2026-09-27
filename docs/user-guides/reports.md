# Reports

Operational reports for the dojo: who is training, who is celebrating, and where the money is coming from. Every report exports to CSV.

Open **Reports** (sidebar → Overview). Requires `analytics:view`.

## Attendance rate

Shows each active/trial student's **attendance rate over the last 30 days**: sessions **attended ÷ eligible**. A session is *eligible* for a student when it was held at one of their locations, for one of their disciplines (the same rule the check-in roster uses) — so a student is never penalised for classes they were never able to attend. Students with no eligible sessions show "—".

The school-wide average is shown above the table; each row links to the student's record (where a rolling 90-day rate also appears on the Recent attendance card).

## Birthdays & anniversaries

Two lists for the current month:

- **Birthdays** — each student's birthday day and the age they turn.
- **Training anniversaries** — students who joined in this month a year or more ago, with the number of years.

Export either list from its card.

## Revenue

Recorded payments over the last 6 months (the same collection basis as the Analytics revenue trend):

- **Revenue by plan** — payments grouped by the enrollment plan the invoice belongs to; one-off invoices not tied to a plan fall under "One-off / other".
- **Estimated monthly recurring revenue** — active recurring enrollments, with each plan normalised to a monthly figure (weekly × 52/12, quarterly ÷ 3, yearly ÷ 12). Item plans are excluded (they are not recurring).

The estimate reflects **plan prices × active enrollments**, not invoices actually collected — pair it with the collected figure for a full picture.

## Exports

| Report | CSV |
|---|---|
| Attendance rates | `/api/reports/attendance-rates` |
| Birthdays | `/api/reports/celebrations?variant=birthdays` |
| Anniversaries | `/api/reports/celebrations?variant=anniversaries` |
| Revenue (collected + recurring) | `/api/reports/revenue` |

CSVs are UTF-8 with a BOM (so Excel opens them cleanly) and are named with the export date.

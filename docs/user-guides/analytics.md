# Analytics

The school's numbers, all on one page (`/analytics`): attendance, revenue, retention, and members per location. The [Dashboard](./dashboard) is the action worklist; this is the overview.

## What's on it

| Widget | What it shows |
|---|---|
| **Overview counters** | Active students, trials in progress, sessions this week, outstanding balance |
| **Weekly attendance trend** | Trained sessions per week (Present + Late), filterable by location |
| **Monthly revenue** | Recorded payments per month across all (or a selected) location |
| **At-risk students** | Active students whose training has lapsed — your retention worklist |
| **Members per location** | Student counts per dojo site |

## Reading the at-risk list

The at-risk list surfaces active students whose recent attendance has dropped off — the students most likely to churn. Open a student from the list to check their attendance history before reaching out.

## Notes

- The weekly trend counts **Present** and **Late** attendance — the same basis used for belt eligibility. The solid bar counts **marks**: a member training two classes in a week counts once per class (e.g. a member who trains at two locations), so it can exceed the member count; the second-colour bar shows **unique members** and caps at your member count.
- Revenue counts recorded payments, not invoiced amounts, so the chart reflects money actually received.
- Invoices may be tagged to a location for per-location revenue; recurring invoices stay school-wide and count only towards "All locations".

Requires the `analytics:view` permission. All roles except administration-only custom roles have it by default.

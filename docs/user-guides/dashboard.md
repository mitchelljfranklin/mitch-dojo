# Dashboard

The dashboard is the landing page after login and the daily overview of your school.

## What's on it

| Widget | What it shows |
|---|---|
| **Overview counters** | Active students, trials in progress, sessions this week, outstanding balance |
| **Weekly attendance trend** | Trained sessions per week (Present + Late), filterable by location |
| **Monthly revenue** | Recorded payments per month across all (or a selected) location |
| **At-risk students** | Active students whose training has lapsed — your retention worklist |
| **Members per location** | Student counts per dojo site |
| **Failed emails** | A chip appears when recent sends failed, linking to the [Email Log](../configuration/email-log) |

Requires the `analytics:view` permission. All roles except administration-only custom roles have it by default.

## Reading the at-risk list

The at-risk list surfaces active students whose recent attendance has dropped off — the students most likely to churn. Open a student from the list to check their attendance history before reaching out.

## Notes

- The weekly trend counts **Present** and **Late** attendance only — the same basis used for belt eligibility.
- Revenue counts recorded payments, not invoiced amounts, so the chart reflects money actually received.
- Invoices may be tagged to a location for per-location revenue; recurring invoices stay school-wide and count only towards "All locations".

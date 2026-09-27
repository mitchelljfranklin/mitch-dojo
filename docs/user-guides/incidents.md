# Incident Reports

The accident book: a dated record of injuries and incidents on the mats, optionally tied to a student and a location, so you have a defensible record if anything is questioned later.

## Logging an incident

Open **Incidents** (sidebar → People) to see the accident book, then click **Log incident** to open the report form:

| Field | Notes |
|---|---|
| **Title** | A short, searchable label (e.g. "Ankle sprain during sparring") |
| **Date** | When it happened (may be back-dated) |
| **Severity** | Minor / Moderate / Serious |
| **Student** | Optional — leave as "No student" for a visitor or a facility issue |
| **Location** | Optional |
| **What happened** | The free-text account |
| **Injury** / **Treatment given** / **Actions taken** | Optional follow-up detail |
| **Medical attention required** | Tick if outside medical care was sought |

Reports are **Open** until you close them. The list has **Open / Closed / All** filters, and each student's record shows a card of incidents logged against them (visible to anyone with `incidents:view`).

## Closing and deleting

Open a report to edit it, **Close** it when resolved (the resolution date is kept), or reopen it if it turns out not to be finished. **Delete** permanently removes it — deletions are audited, and incident editing/closing/deleting is audit-logged.

## Permissions

| Action | Permission |
|---|---|
| View the accident book and a student's incidents | `incidents:view` |
| Log, edit, close, and delete reports | `incidents:manage` |

Seeded roles: **Admin** and **Trainer** get both; **Viewer** gets view-only. Only staff with `incidents:manage` see the log/edit/close/delete controls.

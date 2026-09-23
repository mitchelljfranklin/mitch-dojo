# Classes & Schedule

Courses are the recurring classes you teach; the schedule is their weekly timetable.

## Trainers

Trainers are roster entries — a person who teaches, with or without a login:

- **Trainer without a user account** — guest instructors, assistant coaches. They appear on courses but can't log in.
- **Trainer with a user account** — staff who log in get the seeded **Trainer** role (floor operations; see [RBAC & Roles](./rbac)).

## Courses

Each course belongs to **exactly one location** and teaches **exactly one discipline** (see [Belts & Gradings](./belts)):

| Field | Notes |
|---|---|
| Name | e.g. "Kids Karate — Northside" |
| Location | One dojo site |
| Discipline | Which belt ladder it feeds |
| Trainer | Who teaches it |
| Weekly times | Recurring slots, e.g. Tue 16:00, Thu 16:30. Each slot has a **Trial bookable** checkbox (on by default) — untick it to keep the class off the [public trial-booking page](./trials) (senior-only sessions, for example) |

A discipline taught at multiple locations means one course per location, each with its own schedule and attendance.

## Sessions

Sessions are auto-generated **14 days ahead** from the weekly times whenever the schedule or a course page is viewed. Generation is idempotent — the same course/date/time is never duplicated.

- **Cancel** a session (e.g. a public holiday) — it's kept with a `CANCELLED` status, never deleted, so history stays honest.
- **Location changes** — a session keeps the location it was generated with, so past attendance never moves.

## Timetable

The schedule page shows the week's timetable — courses as columns, weekdays as rows, per location. Open any session from it to take attendance.

## Permissions

| Action | Permission |
|---|---|
| View courses & schedule | `classes:view` |
| Create/edit courses, trainers, times | `classes:edit` |

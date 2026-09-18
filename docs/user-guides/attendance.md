# Attendance & Check-in

Attendance drives everything downstream — belt eligibility, retention analytics, and reminder targeting.

## Taking attendance

Open a session from the timetable or a course page. The sheet lists the course's enrolled students with four statuses:

| Status | Meaning | Counts toward belts? |
|---|---|---|
| **Present** | Trained | Yes |
| **Late** | Arrived late, trained | Yes |
| **Excused** | Notified absence | No |
| **Absent** | No-show | No |

- **Mark all** — set everyone to Present, then adjust the exceptions.
- Saving a sheet with status changes keeps those rows' source as `MANUAL`.

## QR check-in

Each location has a **public, no-login check-in page**. Students (or parents) scan the QR code on arrival, pick themselves from the list, and are marked Present.

- The page is secured by a **revocable token** — rotate it from the location page if the QR leaks (a poster in a shared hallway, for example).
- Check-ins record `Present` with source `CHECKIN`. Staff can overwrite afterwards; the source becomes `MANUAL`.
- Students with overdue invoices past the suspension window are **refused check-in** (configurable; see [Memberships settings](../configuration/memberships)).

::: tip Print the QR
The check-in URL is stable per location — print the QR once and stick it at the front desk.
:::

## Kiosk mode

For a tablet at the front desk, the **Kiosk mode** toggle hides the branding chrome, goes edge-to-edge, and enlarges the name chips so students can tap themselves from across the room. It also requests the browser's fullscreen. The mode persists in the URL (`?kiosk=1`) — bookmark it once and the tablet always opens in kiosk mode.

## Why attendance matters

- **Belt eligibility** — cumulative Present + Late sessions across all courses of a student's discipline (see [Belts & Gradings](./belts)).
- **Retention** — the dashboard's at-risk list is driven by attendance drop-off.
- **Reminders** — class reminders target students who train the course's discipline.

## Permissions

| Action | Permission |
|---|---|
| View attendance | `attendance:view` |
| Mark attendance | `attendance:mark` |

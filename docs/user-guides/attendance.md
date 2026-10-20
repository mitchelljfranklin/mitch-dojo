# Attendance & Check-in

Attendance drives everything downstream — belt eligibility, retention analytics, and reminder targeting.

## The attendance browser

**Sidebar → Attendance** lists **every session — past and upcoming** — in one filterable table. The default window covers the last 4 weeks plus the next 2 (today's classes on top); adjust the **from/to dates** to travel further back, and filter by course name, location, or status.

Each row shows the date, time, course, location, trainer, status, and how many students were **marked** and **trained** — a quick attendance dashboard. **Open sheet** jumps to that session's attendance sheet, however old it is.

## Taking attendance

Open a session from the timetable or a course page. The sheet lists the students training that **course's discipline** — a Judo class does not show the Karate kids. Use **Show everyone here** to widen the roster to every active/trial student at the location for drop-ins (the toggle carries through to the PDF).

The sheet offers four statuses:

| Status | Meaning | Counts toward belts? |
|---|---|---|
| **Present** | Trained | Yes |
| **Late** | Arrived late, trained | Yes |
| **Excused** | Notified absence | No |
| **Absent** | No-show | No |

- **Mark all** — set everyone to Present, then adjust the exceptions.
- Saving a sheet with status changes keeps those rows' source as `MANUAL`.
- **Download PDF** — a branded, printable record of the session: roster with each student's recorded status and the present/trained totals. Reachable from any sheet, however old.

## QR check-in

Each location has a **public, no-login check-in page**. Students (or parents) scan the QR code on arrival, pick themselves from the list, and are marked Present. A class lists only the students training that class's discipline.

- The page is secured by a **revocable token** - rotate it from the location page if the QR leaks (a poster in a shared hallway, for example).
- Check-ins record `Present` with source `CHECKIN`. Staff can overwrite afterwards; the source becomes `MANUAL`.
- Students with overdue invoices past the suspension window are **refused check-in** (configurable; see [Memberships settings](../configuration/memberships)).
- The page follows the school's **Default language** ([Admin → General](../configuration/general)); a selector in the corner switches language for that device and remembers the choice.

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

# Belts & Gradings

Belt progression is per **discipline**, with eligibility computed from cumulative attendance.

## Disciplines

A school may teach several disciplines (e.g. Karate, Jujitsu). Each discipline owns its **belt ladder** and its students' ranks:

- A student promoted to Yellow (Karate) at one location is Yellow at **every** location teaching Karate.
- A student in two disciplines has separate, independent ranks — Karate attendance never counts toward the Jujitsu ladder.
- Disciplines with courses cannot be deleted (reassign courses first).

## Belt ladders

Each discipline's ladder is a ranked list of belts. For each belt you set:

| Field | Meaning |
|---|---|
| Name | e.g. Yellow, Green, Black |
| Colour | Displayed on progression pages and history |
| Required trainings | **Cumulative** total of Present + Late sessions needed to be awarded this belt (0 for the entry rank) |

Required trainings are the cumulative total from the very first class — e.g. Black at 300 means a student training twice a week reaches it around the three-year mark. Ladders are managed on the belts page (`/belts/[disciplineId]`), not in Settings.

::: warning Awarded belts are locked
Belt entries that have been awarded cannot be deleted — history rows keep a copy of the name and colour so old records stay readable even after you reorganise the ladder.
:::

## Eligibility & promotion

On the discipline's progression page you see each discipline-assigned student with:

- Current rank, and their progression history
- A count of **all** trained sessions across **every** course of that discipline, at any location
- An eligibility badge for the next belt

Promoting:

1. Open the discipline's progression page.
2. Eligible students show the badge; click **Promote**.
3. Students below the threshold require the **Override** tick — for make-up gradings and exceptional progression. The override is recorded.

Eligibility counts from the student's very first class, including imported history — see [Importing History](./importing-history).

### Transferring students (starting credit)

If you don't want to import a transferring student's full history, just record their current belt via **Promote**: because it's their **first belt** in the discipline, the sheet shows a **Starting trainings credit** field, prefilled with the belt's requirement — enter more if they had extra sessions, then save. The counter always covers the belt being awarded: a lower value is topped up at save.

### Multi-level gradings

Grading a student past one belt (e.g. Yellow straight to Black) works the same way — the belt picker lists every belt, and the counter is **reconciled at every promotion** so it never sits below the rank just awarded. The next grading therefore always starts aligned with the current rank. If the count is below the target belt's requirement, the promotion needs the **Override** tick; after saving, the counter aligns to the new rank.

## Permissions

| Action | Permission |
|---|---|
| View belts, ladders, progression | `belts:view` |
| Edit ladders, record promotions | `belts:edit` |

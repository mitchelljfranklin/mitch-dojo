# Locations

Locations are your dojo sites — the physical places you run classes. The tenant is the **school**; each `Location` is one site (e.g. "Northside Dojo", "Riverside Community Hall").

## Multi-location model

- Students train at one or more locations, with exactly one **primary (home) dojo** used for reporting and belt eligibility.
- Every class belongs to exactly one location.
- Locations are **organisational, not an access boundary** — all staff see all locations, and views filter by them. Per-location access isolation is deliberately out of scope.
- Revenue can be tracked per location when invoices are tagged.

## Managing locations

Manage sites under **Admin → Locations** (requires `locations:edit`):

1. Click **New location**.
2. Give it a name (and address details if you like).
3. Assign students from their records.

## Deleting vs deactivating

A location with assigned students **cannot be hard-deleted** — deactivate it instead. This keeps attendance and belt history intact. Hard delete is only possible for unreferenced locations.

::: warning Don't create scratch locations
Courses, sessions, and students all reference locations. Prefer deactivating over deleting — and avoid creating throwaway sites for one-off events.
:::

## Public check-in per location

Each location gets its own QR check-in page — see [Attendance & Check-in](./attendance).

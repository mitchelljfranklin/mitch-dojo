# Appearance

White-label branding: make the platform yours on every surface your students see.

## Settings

| Setting | Default | Notes |
|---|---|---|
| **Primary colour** | theme default | Hex value; drives buttons, accents, and highlights |
| **Secondary colour** | theme default | Hex value |
| **Logo** | none | Uploaded image; appears on the booking page, member portal, check-in screens, and in every email header |
| **Corner radius** | 10 (0–16) | UI roundness, from sharp to soft |
| **Page width** | constrained | `constrained` or `full` layout width |
| **Booking headline** | "Book a free trial class" | Up to 120 characters |
| **Booking description** | "Try a class — no experience needed…" | Up to 300 characters |

## Where your branding appears

- **Public surfaces** — the `/book` trial-booking page (with your headline + description)
- **Member surfaces** — the read-only `/portal` and the QR check-in screens
- **Every email** — logo in the header, org name in the identity
- The in-app dashboard for staff

## Logo handling

Upload a PNG or SVG; it's stored via the [storage backend](./storage) and served through an authenticated route with caching. Deleting the organization's logo reference cleans the file up — a scheduled orphan sweep is the backstop.

### The logo plate

Every logo renders on a small **white plate** (a rounded square with a hairline border) — in the app, on public pages, and in emails:

- A **white or light badge** stays visible in dark mode and against email clients' white background (the hairline border does the work).
- A **black or dark badge** always sits on guaranteed white, so it keeps its contrast when staff flip the app to dark mode.

Because the plate is white in both themes, a single-colour badge works everywhere with **one upload** — no need to produce a separate dark-mode asset. Upload a badge with a **transparent background** for the cleanest result; opaque backgrounds also work but show their rectangle on the plate.

Requires `settings:manage`. Changes are audited.

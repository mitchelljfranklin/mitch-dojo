# Appearance

White-label branding: make the platform yours on every surface your students see.

## Settings

| Setting | Default | Notes |
|---|---|---|
| **Primary colour** | theme default | Hex value; drives buttons, accents, and highlights |
| **Secondary colour** | theme default | Hex value |
| **Logo (light backgrounds)** | none | Uploaded image; appears on the booking page, member portal, check-in screens, and in every email header |
| **Logo (dark backgrounds)** | none | Optional light/white knockout version, shown on dark-mode surfaces |
| **Email logo** | Primary | Which logo emails use: primary on a white plate, or the dark logo on a dark plate |
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

### Logo handling

Upload a PNG or JPG (max 2 MB) for each variant; files are stored via the [storage backend](./storage) and served through an authenticated route with caching. Removing a logo cleans its file up — a scheduled orphan sweep is the backstop.

### Light and dark logos

Dojo badges are often single-colour emblems, which are invisible against the wrong background. Mitch‑Dojo handles this with **two optional uploads**:

| Variant | Where it appears |
|---|---|
| **Logo (light backgrounds)** | Light-theme app and public pages, on a white plate |
| **Logo (dark backgrounds)** | Dark-theme app and public pages, rendered bare (it was made for dark backgrounds) |

If no dark logo is uploaded, the primary logo on its white plate is used everywhere — one upload still works for most badges. Upload a **transparent-background** badge for the cleanest result.

### The logo plate

The primary logo always renders on a small **white plate** (a rounded square with a hairline border) in the app and in emails:

- A **black or dark badge** always sits on guaranteed white, so it keeps its contrast when staff flip the app to dark mode.
- A **white badge** keeps its shape thanks to the hairline border — and if you upload the dark variant instead, it swaps in automatically on dark surfaces.

### Emails

Emails render on a white background regardless of theme. The **Email logo** setting chooses what goes in the header:

- **Primary logo (white plate)** — the default; safe for every badge.
- **Dark logo (dark plate)** — renders your dark variant on a dark plate, so white knockout badges read correctly. Only selectable once a dark logo is uploaded.

Requires `settings:manage`. Changes are audited.

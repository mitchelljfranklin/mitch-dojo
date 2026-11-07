# Appearance & branding

Mitch‑Dojo is **white-label**: make the platform look like your school on every surface your students and staff see. Branding is stored in the database and applied at runtime — no theme files, rebuilds, or CSS overrides required.

## What you can brand

| Surface | What changes |
|---|---|
| **Staff UI** | Organization name, light/dark logo, primary and secondary colours, corner radius, content width |
| **Login and setup** | Logo and organization name |
| **Public booking page** | Logo, organization name, colours, headline, and description |
| **Member portal** | Logo, organization name, and colours |
| **QR check-in** | Logo and organization name (kiosk mode intentionally hides the header) |
| **Emails** | From name/address, email logo, and the `{{appName}}` template token |
| **Generated PDFs** | Organization name and primary logo; invoices also use the primary accent colour |

A custom domain is configured at the **deployment** layer, not here: point the hostname at the app, terminate TLS at your reverse proxy, and set `APP_URL`. See [Docker Compose](../deployment/docker) and [Reverse Proxy](../deployment/reverse-proxy).

## Settings

| Setting | Default | Notes |
|---|---|---|
| **Primary colour** | theme default | Six-digit hex; drives buttons, links, active states, and invoice status accents |
| **Secondary colour** | theme default | Six-digit hex; drives badges, pills, and secondary elements |
| **Logo (light backgrounds)** | none | PNG, JPG, GIF, or WEBP, max 2 MB; appears on public/member pages, login, staff UI, emails, and PDFs |
| **Logo (dark backgrounds)** | none | Optional light/white knockout version; shown automatically on dark-mode surfaces |
| **Email logo** | Primary | Primary logo, or the dark logo on a dark plate; the dark option is available once a dark logo exists |
| **Corner radius** | 10 (0–16) | UI roundness, from sharp to soft |
| **Page width** | constrained | `constrained` or `full`; controls the staff content area (the dashboard is always full-width) |
| **Booking headline** | "Book a free trial class" | Up to 120 characters; shown at the top of `/book` |
| **Booking description** | "Try a class - no experience needed, all ages welcome." | Up to 300 characters; the organization name sits above it automatically |

## Colour and theme behaviour

Primary and secondary colours apply to the **light theme**. Dark mode keeps its built-in, contrast-tuned palette so a dark brand colour cannot make controls disappear. Primary/secondary foreground colours are calculated automatically for readable text; use the **Reset** button beside a colour to return to the default.

The organization name is managed separately under [General](./general), because it also feeds browser titles, PDFs, and email tokens. Set the email From name under [Email](./email) — it is independent of the organization name.

## Logo handling

Upload a **PNG, JPG, GIF, or WEBP** up to **2 MB**. SVG is intentionally rejected because it can contain script and is served inline from the app origin.

Logos are stored through the configured [storage backend](./storage) and served through the public logo route with cache-busting. Removing a logo cleans its file up; the scheduled orphan sweep is the backstop.

### Light and dark logos

Dojo badges are often single-colour emblems, which are invisible against the wrong background. Mitch‑Dojo renders logos **bare** (no backing plate) and handles contrast with **two optional uploads**:

| Variant | Where it appears |
|---|---|
| **Logo (light backgrounds)** | Light-theme app and public pages, login screens, emails, and PDFs |
| **Logo (dark backgrounds)** | Dark-theme app and public pages, rendered bare |

Each variant renders where it was designed to work — a white knockout badge on dark surfaces, a dark badge on light surfaces. If your badge is dark, upload the dark variant so it stays visible when staff use dark mode; if your badge is white, upload it as the dark variant and a lighter version as the primary. Transparent-background images give the cleanest result.

### Emails

Emails render on a white background regardless of theme. The **Email logo** setting chooses what goes in the header:

- **Primary logo** — the default; rendered bare (designed for light backgrounds).
- **Dark logo (dark plate)** — renders your dark variant on a dark rounded plate, so white knockout badges read correctly. Only selectable once a dark logo is uploaded.

Email branding is completed under [Email](./email) (From name and address) and [Templates](./templates) (subject/body copy and the `{{appName}}` token). Authored template text is not machine-translated; it stays exactly as written.

### PDFs

Invoices, student report cards, attendance sheets, and printable agreements use your organization name and **primary** logo. Invoices also use the **primary** accent colour for their status line. PDF labels follow the viewer's language and use bundled Noto fonts; the dark logo variant is not used in PDFs. See [Languages](../welcome/features#languages) for the PDF font caveats.

## What white-labeling does not change

- The documentation site, source repository, and open-source project name remain **Mitch‑Dojo**.
- The app is **AGPL-3.0**; rebranding does not change the license obligations.
- Branding is constrained to safe, validated settings — there is no arbitrary CSS/HTML injection.
- Some technical identifiers (for example calendar `PRODID`/`UID` values and fallback local email addresses) are implementation details, not student-facing branding. Configure the From address under [Email](./email) rather than relying on the fallback.

## Branding checklist for go-live

1. Set **Organization name** under [General](./general); optionally store a support email for your records.
2. Upload your light logo, and a dark variant if staff use dark mode.
3. Choose primary/secondary colours, radius, and page width; reset any colour you do not want to override.
4. Replace the booking headline and description.
5. Set the **From name** and **From address** under [Email](./email); choose the email logo here.
6. Review subject/body copy under [Templates](./templates), and agreement documents under [Documents](./documents).
7. Open `/book`, the member portal, a QR check-in page, an email, and a PDF in both light and dark themes to confirm the result.

Requires `settings:manage`. Changes are audited.

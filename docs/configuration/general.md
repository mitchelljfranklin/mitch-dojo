# General

Organization identity — the name everything else picks up.

## Settings

| Setting | Default | Notes |
|---|---|---|
| **Organization name** | "My Dojo" | Used across the UI, public pages, portal, check-in screens, and as the `{{appName}}` token in every email template |
| **Support email** | empty | Shown as the contact address where appropriate |
| **Default country** | none | Preselects the country on the student form's address section (ISO 3166 code) |

## Why the org name matters

Change the organization name here and it propagates everywhere: sidebar, browser titles, the [booking page](../user-guides/trials), the [member portal](../user-guides/member-portal), check-in screens, and every email via the `{{appName}}` token. One place, no hunting.

Requires `settings:manage`. Changes are audited.

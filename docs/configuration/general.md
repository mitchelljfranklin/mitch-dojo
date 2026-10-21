# General

Organization identity — the name everything else picks up.

## Settings

| Setting | Default | Notes |
|---|---|---|
| **Organization name** | "My Dojo" | Used across the UI, public pages, portal, check-in screens, and as the `{{appName}}` token in every email template |
| **Support email** | empty | Shown as the contact address where appropriate |
| **Default language** | English | Language used across the app and public pages unless someone picks another with the language selector. Ships with English and Español |
| **Default country** | none | Preselects the country on the student form's address section (ISO 3166 code) |

## Why the org name matters

Change the organization name here and it propagates everywhere: sidebar, browser titles, the [booking page](../user-guides/trials), the [member portal](../user-guides/member-portal), check-in screens, and every email via the `{{appName}}` token. One place, no hunting.

## Default language

The **Default language** is what staff and visitors see until they choose another one. On the public [booking page](../user-guides/trials), the language selector overrides it for that visitor and the choice is remembered in a cookie. Setting it to Español makes the booking page open in Spanish for everyone who has not switched back to English.

Automated emails use the school default, since recipients do not have their own language setting. Generated PDFs (invoices, report cards, attendance sheets, printable agreements) follow the viewer’s selected language, falling back to the school default. Email shells, test messages, and PDF labels are translated; the subject/body copy you write under [Templates](./templates) stays exactly as authored.

The app currently ships with English and Spanish. Adding another language is a code change (a new message catalog and locale entry), not a settings toggle.

::: note There is no in-app time zone setting
The dojo's time zone comes from the deployment container's `TZ` environment variable (the compose files default to `Australia/Brisbane`). Check-in, reminders, and analytics all key off the server's local day — see the [deployment time zone note](../deployment/docker#time-zone).
:::

Requires `settings:manage`. Changes are audited.

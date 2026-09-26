# Admin Overview

Everything runtime-configurable lives in the **Admin area**, reached via the gear button in the header (visible only to roles with any admin-area permission). The URL prefix is `/admin/*`; old `/settings` links redirect.

## The 16 sections, in 7 groups

| Group | Sections |
|---|---|
| **Workspace** | [General](./general) · [Appearance](./appearance) |
| **Storage** | [Storage](./storage) |
| **Programs** | [Memberships](./memberships) · [Communication](./communication) · [Documents](./documents) |
| **Email** | [Email](./email) · [Templates](./templates) · [Email log](./email-log) |
| **Locations** | Locations (see [User guide](../user-guides/locations)) |
| **Access & security** | [Users & Roles](./users-roles) · [Sign-in & SSO](./sso) |
| **Platform** | [Audit log](./audit) · [Scheduling](./scheduling) · Health |

## Principles

- **No file edits, ever.** Everything on these pages is stored in the database and takes effect immediately. Only deployment bootstrap (secrets, database URL) belongs in the environment.
- **Secrets encrypted at rest.** SMTP and cloud-storage credentials are AES-256-GCM encrypted and never returned to the client.
- **Permission-gated.** Most sections require `settings:manage`; Locations uses `locations:edit`, Users & Roles use `users:manage` / `roles:manage`, and Audit log / Email log use `audit:view`. Users without the permission don't see the section at all. (Rate-limit and session settings live on the [Sign-in & SSO](./sso) page and are documented in [Rate Limits](./rate-limits).)
- **Audited.** Every change lands in the [audit log](./audit).

## Keyboard access

The command palette (`Ctrl+K` / `⌘K`) jumps straight to the most-used admin sections — General, Appearance, Users, Roles, Templates, Audit, Email log, Scheduling.

# Admin Overview

Everything runtime-configurable lives in the **Admin area**, reached via the gear button in the header (visible only to roles with any admin-area permission). The URL prefix is `/admin/*`; old `/settings` links redirect.

## The 15 sections, in 7 groups

| Group | Sections |
|---|---|
| **Workspace** | [General](./general) · [Appearance](./appearance) |
| **Storage** | [Storage](./storage) |
| **Programs** | [Memberships](./memberships) · [Communication](./communication) |
| **Email** | [Email](./email) · [Templates](./templates) · [Email log](./email-log) |
| **Locations** | Locations (see [User guide](../user-guides/locations)) |
| **Access & security** | [Users & Roles](./users-roles) · [Rate Limits](./rate-limits) |
| **Platform** | [Audit log](./audit) · [Scheduling](./scheduling) · Health |

## Principles

- **No file edits, ever.** Everything on these pages is stored in the database and takes effect immediately. Only deployment bootstrap (secrets, database URL) belongs in the environment.
- **Secrets encrypted at rest.** SMTP and cloud-storage credentials are AES-256-GCM encrypted and never returned to the client.
- **Permission-gated.** Every page and action requires `settings:manage` unless noted; users without it don't see the section at all.
- **Audited.** Every change lands in the [audit log](./audit).

## Keyboard access

The command palette (`Ctrl+K` / `⌘K`) jumps straight to the most-used admin sections — General, Appearance, Users, Roles, Templates, Audit, Email log, Scheduling.

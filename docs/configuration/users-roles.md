# Users & Roles

Staff accounts and the roles that gate them.

## Users

Under **Admin → Users** (`users:manage`):

- Create users with email + password (bcrypt, 12 rounds).
- Assign any role — a system role or a custom one.
- **SSO vs local** — every account shows an **SSO** or **Local** badge. SSO-only accounts (created by [single sign-on](./sso)) have no local password; password reset is only offered for local accounts.
- **Disable** a user instead of deleting: disabled users can't log in (SSO included) but keep audit history readable.
- **Deleting** a user preserves the audit trail — their past actions are attributed to "Deleted user" rather than cascade-deleted. History is never lost.
- Password resets: users self-serve from the login page (rate-limited; template editable under [Templates](./templates)).

## Roles

Three **system roles** are seeded on first run and cannot be deleted: **Admin** (all 24 permissions), **Trainer** (floor operations), **Viewer** (read-only). See [RBAC & Roles](../user-guides/rbac) for the full catalog.

Custom roles (`roles:manage`) pick any subset of the 24 permissions:

1. Click **Create role**.
2. Name it, describe it, tick the permissions.
3. Assign it to users.

Role edits are audited; permission changes take effect on the user's next page load.

When an upgrade adds new permission keys, they are **granted to the system roles automatically at server start** — restart the app and the new keys (e.g. `incidents:manage`) appear on Admin/Trainer/Viewer without a manual reseed. Custom roles are never touched; grant new keys to them by hand if you want them there.

## First-run setup

The very first visit walks through creating the initial administrator — the setup page only exists while no users are present, then it's gone.

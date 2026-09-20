# Audit Log

Every state-changing admin action, recorded.

## What's captured

Student edits, role changes, settings updates, payment recording, email retries, logo uploads, check-in token rotations — anything that changes state via an admin action lands in the log with: who, what (action key), which entity, when, and the changed payload.

The action vocabulary is fixed (`AUDIT_ACTIONS`) — every entry is a known, typed action, never free text.

## Using the log

Filter by user, action, entity, and date. The log is append-only — entries can't be edited or removed from the UI.

## Retention

| Setting | Default | Notes |
|---|---|---|
| **Audit retention** | 0 (keep forever) | Days to keep entries; 0 disables pruning |

Pruning runs on the [scheduler](./scheduling). Keeping forever is the default because audit trails are cheap (a row per action) and priceless when you need them.

## Deleting users

Deleting a user does **not** delete their audit entries — those rows point at "Deleted user". You always can answer "who changed this?" even after staff turnover.

Permissions: view with `audit:view`.

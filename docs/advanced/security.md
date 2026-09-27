# Security

The model behind the platform's defences, for reviewers and the curious.

## Authentication & sessions

- **Credentials auth** (Auth.js v5) — bcrypt at 12 rounds, JWT sessions with a sliding-window expiry (default 30 minutes, configurable).
- **SSO** — Microsoft Entra ID, Google, or any generic OIDC provider, configured in-app with encrypted-at-rest client secrets; first sign-ins auto-provision passwordless accounts with a chosen default role. See [Sign-in & SSO](../configuration/sso).
- **SSO-only mode + break glass** — the local form can be hidden (anti-lock-out ignored while no provider is configured), and single-use break-glass URLs (24h, bcrypt-hashed, rate-limited) restore it. See the [SSO page](../configuration/sso#sso-only-mode-and-break-glass).
- **First-run setup** exists only while zero users exist; it disappears after the administrator is created.
- **Password resets** — single-use, expiring tokens, pruned by the scheduler; per-IP rate limiting (default 1/min). SSO-only accounts are silently skipped (the IdP owns their credentials).
- SSO domain restriction is enforced server-side before account linking; provisioned roles always come from the DB, never from IdP claims.

## Authorization

- **24 fine-grained `resource:action` permissions**, enforced with `requirePermission` at the start of **every** server action, route handler, and page.
- UI controls are **hidden, never disabled**, when a role lacks the permission — no dead buttons.
- Admin-area access is itself permission-gated: the gear button doesn't render without any admin permission.

## Transport & headers

- **Nonce-based CSP** with `strict-dynamic`, applied to document GETs only; never rewrites headers on Server-Action POSTs/RSC requests; no `upgrade-insecure-requests`.
- HSTS delegated to the reverse proxy (see [Reverse Proxy](../deployment/reverse-proxy)).

## Secrets & cryptography

- `AUTH_SECRET`, `APP_ENCRYPTION_KEY`, `CRON_SECRET` — environment only, never stored in the database, never returned to the client.
- **AES-256-GCM** for secrets at rest (SMTP password and OAuth2 secrets, cloud-storage credentials). Rotating `APP_ENCRYPTION_KEY` invalidates stored secrets (logged warning, no crash — re-enter them).
- **Constant-time comparison** for all secret checks (cron secret included) — no timing side channels.

## Rate limiting

Per-IP, in-memory, per process — deliberately simple for the single-container deployment. Client-IP resolution honours `TRUSTED_PROXY_COUNT`; a mismatch breaks limiting (see the warning in [Reverse Proxy](../deployment/reverse-proxy)).

## File uploads

- MIME allowlist **plus magic-byte sniffing** — a renamed executable doesn't pass.
- Size limits per file (default 20 MB) and extension allowlist, configurable in [Storage](../configuration/storage).
- Files are served only through authenticated routes; there are no public object URLs.

## Public surfaces

| Surface | Protections |
|---|---|
| `/book` trial booking | Per-IP rate limit + honeypot field |
| `/checkin/[location]` | Revocable token in the URL |
| `/portal` | Hashed, expiring (30-day) single-student tokens |
| `/login` break-glass | Single-use, 24h, bcrypt-hashed token + per-IP rate limit |
| `/api/cron/run` | Constant-time secret + rate limit |

## Audit trail

Every state-changing admin action is logged with a typed action key — append-only, survives user deletion ("Deleted user"), retention-configurable (default: forever). See [Audit Log](../configuration/audit).

## Reporting

Found something? Open an issue on the repository — for a self-hosted platform, a well-written issue with reproduction steps is the fastest path to a fix.

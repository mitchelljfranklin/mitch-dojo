# Rate Limits

Sign-in security: login throttling, session lifetime, password-reset and break-glass throttling. SSO configuration lives on the neighbouring [Sign-in & SSO](./sso) page.

## Settings

| Setting | Default | Notes |
|---|---|---|
| **Login attempts per minute (per IP)** | 10 | In-memory, per process — sized for the single-container deployment |
| **Password resets per minute (per IP)** | 1 | Aggressive by design; reset links are single-use and expire |
| **Break-glass attempts per minute (per IP)** | 10 | Token verifications on the login page for [break-glass URLs](./sso#sso-only-mode-and-break-glass) |
| **Session timeout** | 30 min | Sliding window — activity extends the session; 0 means never expire |

## How limiting works

- Rate limits are **per IP**, resolved with `TRUSTED_PROXY_COUNT` hops trusted (see [Reverse Proxy](../deployment/reverse-proxy)). A wrong proxy count means everyone shares the proxy's IP — set it correctly.
- Limits reset on a sliding window; a lockout is temporary, not an account lock.
- Secrets are compared in **constant time** (including the cron secret), eliminating timing side channels.

## Practical notes

- Raising the login limit is rarely the right fix for a busy front desk — staff accounts aren't rate-limited per account, only per IP.
- Shorter session timeouts are a reasonable trade at a shared computer; the default 30 minutes suits phones and tablets.

Requires `settings:manage`. Changes are audited.

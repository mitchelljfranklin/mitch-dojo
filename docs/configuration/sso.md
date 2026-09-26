# SSO (Single Sign-On)

Staff can sign in through an identity provider instead of (or alongside) email and password. Three provider types are supported:

| Provider | Auth.js id | Notes |
|---|---|---|
| **Microsoft Entra ID** (Azure AD) | `microsoft-entra-id` | Multi-tenant `common` endpoint; scope per-user via the allowed-domain setting |
| **Google Workspace** | `google` | Standard OAuth2 |
| **Custom OIDC** | `oidc` | Any OpenID Connect provider — Okta, Auth0, Keycloak, Authentik, Authelia, VoidAuth, … |

Configuration is in-app under **Admin → Sign-in & SSO** (requires `settings:manage`). No SSO env vars — everything is DB-backed, with client secrets AES-256-GCM encrypted at rest and never returned to the client.

## Setting a provider up

1. **Create the OAuth client in your IdP** with the callback URL:
   - Entra ID: `https://your-dojo.example.com/api/auth/callback/microsoft-entra-id`
   - Google: `https://your-dojo.example.com/api/auth/callback/google`
   - Custom OIDC: `https://your-dojo.example.com/api/auth/callback/oidc`
2. Go to **Admin → Sign-in & SSO**.
3. Tick **Enable** for the provider, paste the **client ID** and **client secret** ("leave blank to keep" preserves a stored secret).
4. For Custom OIDC, also set the **display name** (shown on the login button) and the **issuer URL** (e.g. `https://your-org.okta.com/oauth2/default`).
5. Optionally restrict sign-ins to an **allowed email domain** (e.g. `yourdojo.com`).
6. Choose the **default role for new SSO users** (see provisioning below).
7. **Save** and test with a real account.

A provider only appears on the login page when it is enabled **and** fully configured (client ID + stored secret) — a half-configured provider never shows a button that dead-ends.

## First sign-in & provisioning

| Situation | What happens |
|---|---|
| SSO identity already linked | Signs in as that user |
| Email matches an existing account | **Links** the identity to that account (passwordless link; local password untouched) |
| No match | **Auto-provisions** a passwordless account with the configured default role |

- Provisioned users have **no local password** — they can't use the email/password path or self-reset.
- The Users manager shows an **SSO** or **Local** badge per user; password reset is only offered for local accounts.
- Provisioning uses an atomic upsert, so two concurrent first sign-ins can't create duplicate accounts.
- If the configured default role was deleted, provisioning **falls back to Viewer**; if no valid role exists at all, sign-in is denied.
- Sign-ins are audit-logged (`LOGIN`) like every other authentication.

## SSO-only mode and break glass

Ticking **Disable email/password sign-in (SSO only)** does two things: it hides the local login form **and** rejects local credentials at the sign-in callback — so a hidden form can't be bypassed by posting to the credentials endpoint directly. (Passwordless SSO accounts can never use it anyway.) Two safety rails:

- **Anti-lock-out** — the flag is ignored while zero SSO providers are fully configured, and the save action refuses the combination outright. A mis-click can never lock everyone out.
- **Break glass** — click **Generate URL** on the SSO page to create a single-use sign-in URL (`/login?breakGlass=<token>`):

  - Valid for **24 hours**, **one use only** (consumed atomically on first render), rate-limited per IP (configurable on the same page).
  - Only a bcrypt hash is stored — the URL is **shown once**, so copy it somewhere safe (password manager, sealed envelope). Generating a new one revokes the old.
  - Using it restores the local form and mints a short-lived (15-minute) local sign-in grant; the resulting login is a normal credentials sign-in (rate-limited, audited).

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Provider button doesn't appear | Provider disabled, or client ID/secret not saved (secrets are presence-checked) |
| `Sign-in was denied` after IdP login | Allowed-domain restriction, or the user's account is disabled |
| SSO silently stopped working after a key rotation | `APP_ENCRYPTION_KEY` changed — stored secrets are undecryptable; re-save them |
| Callback URL mismatch | `APP_URL` (or an explicit `AUTH_URL`) must match the redirect registered in the IdP |

## Security notes

- Client secrets are encrypted (AES-256-GCM) and only presence booleans reach the client.
- Domain restriction is enforced server-side before any account linking; it's never trusted from the IdP.
- The credentials provider remains rate-limited as before — SSO adds a surface, it doesn't weaken the existing one.
- MFA belongs at the IdP — enable it there (Entra ID conditional access, Google 2SV, etc.).

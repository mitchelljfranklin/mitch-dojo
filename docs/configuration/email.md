# Email

SMTP delivery configuration. Mitch‑Dojo sends via **Nodemailer over SMTP** — any standard relay works (SendGrid, Mailgun, AWS SES, or your own mail server).

## Setup

1. Go to **Admin → Email**.
2. Choose your **authentication mode** (see OAuth2 below), then enter your SMTP credentials:

   | Field | Notes |
   |---|---|
   | **SMTP host** | e.g. `smtp.sendgrid.net` |
   | **SMTP port** | Typically 587 (TLS) or 465 (SSL); default 587 |
   | **SMTP username** | The mailbox messages send from |
   | **Auth-specific secret** | Password, or OAuth2 credentials — encrypted at rest |
   | **From address** | Sender email for all notifications |
   | **From name** | Display name for outgoing mail — set this to your school name; it is separate from the Organization name setting |

3. **Save**, then send a test from **Admin → Templates** (sample-send) to verify delivery end-to-end.

## OAuth2 (Gmail / Microsoft 365)

Most large providers are deprecating basic-auth SMTP. Choose **OAuth2** as the authentication mode to sign in with an XOAUTH2 refresh-token flow instead of a password:

| Field | Google | Microsoft 365 (Entra ID) |
|---|---|---|
| **Client ID** | From the Google Cloud OAuth client | Azure app registration client ID |
| **Client secret** | OAuth client secret | App registration client secret |
| **Tenant ID** | not needed | Directory (tenant) ID — builds the token endpoint and scope |
| **Refresh token** | From the OAuth consent flow (offline access, `https://mail.google.com/` scope) | Delegated token with the `SMTP.Send` scope (`offline_access`) |

- The refresh token is exchanged automatically for short-lived access tokens on every send — no token babysitting.
- Secrets (client secret + refresh token) are AES-256-GCM encrypted at rest and never returned to the client; saving with those fields blank keeps the stored values.
- The auth type is per-school: switching between basic and OAuth2 keeps the other mode's non-secret configuration.
- Microsoft 365 note: SMTP AUTH must be enabled for the mailbox (or the org), and the app registration needs the `SMTP.Send` delegated permission with admin consent.

## Provider examples (basic auth)

**SendGrid:**
```
Host: smtp.sendgrid.net    Port: 587    User: apikey    Password: SG.xxxx
```

**Mailgun:**
```
Host: smtp.mailgun.org     Port: 587    User: postmaster@your-domain
```

**AWS SES:**
```
Port: 587, STARTTLS. Requires IAM credentials with ses:SendRawEmail.
```

## Security

- SMTP secrets are encrypted in the database and never returned to the client — the form only shows whether each one is configured.
- Rotating `APP_ENCRYPTION_KEY` makes stored secrets undecryptable; email sending then fails with a logged warning until they're re-entered (the app doesn't crash).
- Until SMTP is configured, reminder jobs bail out **before** sending — dedup keys are never burned by a broken configuration.
- In OAuth2 mode, missing OAuth2 credentials fall back to basic auth (logged) so the failure surfaces in the email log.

Requires `settings:manage`. Changes are audited.

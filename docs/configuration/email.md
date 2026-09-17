# Email

SMTP delivery configuration. Mitch‑Dojo sends via **Nodemailer over SMTP** — any standard relay works (SendGrid, Mailgun, AWS SES, or your own mail server).

## Setup

1. Go to **Admin → Email**.
2. Enter your SMTP credentials:

   | Field | Notes |
   |---|---|
   | **SMTP host** | e.g. `smtp.sendgrid.net` |
   | **SMTP port** | Typically 587 (TLS) or 465 (SSL); default 587 |
   | **SMTP user** | Authentication username |
   | **SMTP password** | Password or API key — AES-256-GCM encrypted at rest |
   | **From address** | Sender email for all notifications |
   | **From name** | Display name (defaults to your org name) |

3. **Save**, then send a test from **Admin → Templates** (sample-send) to verify delivery end-to-end.

## Provider examples

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

- The SMTP password is encrypted in the database and never returned to the client — the form only shows whether one is configured.
- Rotating `APP_ENCRYPTION_KEY` makes the saved password undecryptable; email sending then fails with a logged warning until the password is re-entered (the app doesn't crash).
- Until SMTP is configured, reminder jobs bail out **before** sending — dedup keys are never burned by a broken configuration.

Requires `settings:manage`. Changes are audited.

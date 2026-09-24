# Templates

Every automated email's subject and body, editable with tokens. Also home of the sample-send that proves your SMTP setup works.

## Template list

| Template | Trigger |
|---|---|
| **Class reminder** | Scheduler, N hours before a session |
| **Payment reminder** | Invoice enters the due-soon window / overdue threshold |
| **Birthday** | On the student's birthday |
| **Booking confirmation** | Public booking page submission (to the prospect) |
| **New-booking alert** | Public booking page submission (to staff recipients) |
| **Trial follow-up** | Open trial past the follow-up window |
| **Portal link** | Staff sends a member-portal magic link |
| **Password reset** | Staff user requests a reset |
| **Welcome** | Reserved welcome email |
| **Test** | The sample-send |

## Tokens

Tokens work in both subjects and bodies and are replaced at send time:

| Token | Available in | Value |
|---|---|---|
| `{{appName}}` | All | Organization name |
| `{{studentName}}` | All student emails | First + last name |
| `{{className}}` | Class reminder | Course name |
| `{{classTime}}` | Class reminder | Date and start time |
| `{{dueDate}}` | Payment reminder | Invoice due date |
| `{{bookingFor}}` | New-booking alert | "Adult" or "Child (guardian: …)" |
| `{{contact}}` | New-booking alert | Email and/or phone the prospect left |
| `{{trialDays}}` | Trial follow-up | Days in the pipeline |
| `{{portalUrl}}` | Portal link | One-time magic link |
| `{{expiryDays}}` | Portal link | Days until the link expires |
| `{{resetUrl}}` | Password reset | One-time reset link |
| `{{expiresIn}}` | Password reset | Link validity window |

## Sample-send

Pick a template, enter a recipient, and send — the email goes out through your configured SMTP with real token replacement. Check the result on the [Email log](./email-log): a `SENT` row confirms the whole pipeline, and a `FAILED` row shows the SMTP error.

::: tip Retry regenerates tokens
Retrying a failed send re-computes tokens from current data — a retried class reminder reflects the session's latest time, and a retried portal-link send issues a **fresh** magic link.
:::

Requires `settings:manage`. Changes are audited.

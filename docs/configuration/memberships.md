# Memberships

Billing rules for invoices and overdue handling. Plan/enrollment management lives on the [Memberships & Payments guide](../user-guides/memberships); this page is the configuration behind it.

## Settings

| Setting | Default | Range | Notes |
|---|---|---|---|
| **Currency** | USD | ISO 4217 (3 letters) | Display formatting only; money is stored as integer cents |
| **Invoice due days** | 14 | 0–90 | Days after generation until an invoice is due |
| **Auto-generate invoices** | on | — | Scheduler creates invoices for active enrollments each billing cycle |
| **Suspend check-in after overdue** | 30 days | 0–365 | Days overdue before QR check-in is refused; **0 disables suspension** |

## How the pieces connect

1. Auto-generation creates invoices for active enrollments (due date = today + *invoice due days*). Plans with **Charge only with attendance** ([plan option](../user-guides/memberships#charge-only-with-attendance)) generate only when the member trained since the previous invoice — the scheduler result reports `generatedInvoices` and `skippedInvoices` (also shown by the manual **Generate now**).
2. A payment reminder fires once when the invoice enters the due-soon window ([Communication](./communication)).
3. Another reminder fires once it's been overdue for the configured days.
4. Past the suspension threshold, the student's QR check-in refuses until the balance is cleared — the attendance sheet still works for staff.

Set suspension to 0 if you never want the front door to refuse anyone.

Requires `settings:manage`. Changes are audited.

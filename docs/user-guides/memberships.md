# Memberships & Payments

Plans, enrollments, invoices, and manual payment recording. Online gateways (Stripe/SEPA/PayPal) are a planned later phase — recording payments by hand covers how most small dojos actually bill.

## Plans & enrollments

A **plan** defines a recurring membership — name, price, and billing period (e.g. "Kids monthly — $95/month"). Students **enroll** in a plan from their record; the enrollment drives invoice generation.

### Charge only with attendance

Some plans bill whether the member trains or not; others should only charge when the member actually turned up. The plan's **Charge only with attendance** checkbox (edit the plan) makes recurring invoices **attendance-gated**:

- Each cycle, the invoice generates only if the member has at least one **trained session** (Present or Late) since the previous invoice.
- No attendance → the cycle is **skipped, not charged** — and billing simply resumes at the next cycle date once they train again.
- The **first invoice** after enrolling always bills (the dojo chose to enroll them; there's no previous period to check).
- Plans with the flag show an **Attendance-gated** badge on the plans table, and the student's enrollment card shows an **Only if trained** badge.
- The setting applies to **future cycles** — invoices already generated are untouched. Turning it on for an existing plan starts gating from the next cycle.

When a cycle is skipped, nothing is charged for it and no invoice exists to pay; the manual **Generate now** button reports how many cycles were skipped, and the scheduler logs the same.

## Invoices

Invoices live at **Memberships → Invoices**, with a direct **Invoices** entry in the sidebar's Management group. With auto-generation on ([Memberships settings](../configuration/memberships)), the scheduler generates invoices for active enrollments on each billing cycle:

- **Due date** — configurable window after generation (default 14 days).
- **Location tagging (optional)** — tag an invoice to a location for per-location revenue on the Analytics page. Recurring invoices stay school-wide and count only towards "All locations".
- **Void** — voided invoices stay visible with a `VOID` status; they are never deleted.

## Recording payments

Open an invoice and record a payment: amount, date, and method (cash, transfer, terminal). The invoice's balance updates and its status reflects paid/partial/overdue. Full payment history is kept on the invoice, and **Download PDF** produces a branded, printable invoice (line items, payment history, balance due).

::: tip Partial payments
Record multiple payments against one invoice — a deposit now, the rest next week. The balance and status track each one.
:::

## Overdue handling

| Setting | Default | Effect |
|---|---|---|
| Payment reminders | on, 3 days before due | One email when the invoice enters the due-soon window |
| Overdue reminder | after 7 days overdue | One more email past the threshold |
| Check-in suspension | after 30 days overdue | Refuses QR check-in until the balance is cleared (0 disables) |

Every generated invoice is also visible to the student in their [member portal](./member-portal) with the current balance.

## Permissions

| Action | Permission |
|---|---|
| View plans, invoices, payments | `memberships:view` |
| Manage plans, enrollments, record payments | `memberships:edit` |

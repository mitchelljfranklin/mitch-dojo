import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FlashToast } from "@/components/flash-toast";
import { RecordPaymentSheet } from "./record-payment-sheet";
import {
  deletePaymentAction,
  voidInvoiceAction,
} from "@/lib/actions/memberships";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getInvoiceDetail } from "@/lib/db/memberships";
import { getMembershipsSettings } from "@/lib/settings";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/schemas/membership";
import { formatDate, formatDateUtc, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

type InvoiceDetailPageProps = {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: InvoiceDetailPageProps) {
  const user = await requirePermission(PERMISSIONS.MEMBERSHIPS_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.MEMBERSHIPS_EDIT);
  const { currency } = await getMembershipsSettings();

  const { invoiceId } = await params;
  const sp = await searchParams;
  const invoice = await getInvoiceDetail(invoiceId);
  if (!invoice) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Memberships", href: "/memberships" },
          { label: "Invoices", href: "/memberships/invoices" },
          { label: `#${invoice.number}` },
        ]}
      />
      {sp.invoiceError ? (
        <FlashToast variant="error" message={sp.invoiceError} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Invoice #{invoice.number}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {invoice.isOverdue ? (
              <Badge variant="destructive">Overdue</Badge>
            ) : (
              <Badge
                variant={
                  invoice.status === "PAID"
                    ? "secondary"
                    : invoice.status === "VOID"
                      ? "outline"
                      : "default"
                }
              >
                {invoice.status}
              </Badge>
            )}
            <span className="text-muted-foreground text-sm">
              Issued {formatDateUtc(invoice.issueDate)} · Due{" "}
              {formatDate(invoice.dueDate)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <a href={`/api/invoices/${invoice.id}/pdf`} download>
              Download PDF
            </a>
          </Button>
          {canEdit && invoice.status === "OPEN" ? (
            <RecordPaymentSheet
              currency={currency}
              invoiceId={invoice.id}
              invoiceNumber={invoice.number}
              balanceCents={invoice.financials.balanceCents}
            />
          ) : null}
          {canEdit && invoice.status === "OPEN" ? (
            <form id={`void-invoice-${invoice.id}`} action={voidInvoiceAction}>
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <ConfirmDialog
                title={`Void invoice #${invoice.number}?`}
                description="A voided invoice is kept for the record but can no longer receive payments."
                confirmLabel="Void invoice"
                formId={`void-invoice-${invoice.id}`}
              >
                <Button type="button" variant="outline">
                  Void
                </Button>
              </ConfirmDialog>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Billed to</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Link
              href={`/students/${invoice.student.id}`}
              className="font-medium hover:underline"
            >
              {invoice.student.firstName} {invoice.student.lastName}
            </Link>
            {invoice.student.email ? (
              <span className="text-muted-foreground">
                {invoice.student.email}
              </span>
            ) : null}
            {invoice.location ? (
              <span className="text-muted-foreground text-xs">
                Location: {invoice.location.name}
              </span>
            ) : null}
            {invoice.enrollment ? (
              <span className="text-muted-foreground text-xs">
                Enrollment: {invoice.enrollment.plan.name}
              </span>
            ) : null}
            {invoice.notes ? (
              <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
                {invoice.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span>
                {formatMoney(invoice.financials.totalCents, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>{formatMoney(invoice.financials.paidCents, currency)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Balance</span>
              <span>
                {formatMoney(invoice.financials.balanceCents, currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {invoice.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-md border p-2 text-sm"
            >
              <span>{item.description}</span>
              <span className="text-right">
                {formatMoney(item.unitPriceCents * item.quantity, currency)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>
            {invoice.payments.length === 0
              ? "No payments recorded yet."
              : `${invoice.payments.length} payment${invoice.payments.length === 1 ? "" : "s"} recorded.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {invoice.payments.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {formatMoney(payment.amountCents, currency)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ??
                    payment.method}{" "}
                  · {formatDate(payment.paidAt)}
                  {payment.recordedBy ? ` · by ${payment.recordedBy.name}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {payment.reference ? (
                  <span className="text-muted-foreground max-w-[14rem] truncate text-xs">
                    Ref: {payment.reference}
                  </span>
                ) : null}
                {canEdit && invoice.status !== "VOID" ? (
                  <form
                    id={`delete-payment-${payment.id}`}
                    action={deletePaymentAction}
                  >
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <ConfirmDialog
                      title="Delete payment?"
                      description="The payment will be permanently removed and the invoice balance restored."
                      confirmLabel="Delete"
                      formId={`delete-payment-${payment.id}`}
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                      >
                        Delete
                      </Button>
                    </ConfirmDialog>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

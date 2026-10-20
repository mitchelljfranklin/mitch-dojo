import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

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

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Memberships.invoices.detail");
  return { title: translate("metaTitle") };
}

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
  const translate = await getTranslations("Memberships.invoices.detail");
  const translateInvoices = await getTranslations("Memberships.invoices");
  const translateMemberships = await getTranslations("Memberships");
  const formatter = await getFormatter();
  const formatMoney = (cents: number, displayCurrency = currency) =>
    formatter.number(cents / 100, {
      style: "currency",
      currency: displayCurrency,
    });
  const formatDate = (value: Date) =>
    formatter.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  const { invoiceId } = await params;
  const query = await searchParams;
  const invoice = await getInvoiceDetail(invoiceId);
  if (!invoice) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: translateMemberships("title"), href: "/memberships" },
          {
            label: translateInvoices("title"),
            href: "/memberships/invoices",
          },
          { label: `#${invoice.number}` },
        ]}
      />
      {query.invoiceError ? (
        <FlashToast variant="error" message={query.invoiceError} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translate("title", { number: invoice.number })}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {invoice.isOverdue ? (
              <Badge variant="destructive">
                {translateInvoices("status.OVERDUE")}
              </Badge>
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
                {translateInvoices(`status.${invoice.status}`)}
              </Badge>
            )}
            <span className="text-muted-foreground text-sm">
              {translate("issued", {
                issued: formatDate(invoice.issueDate),
                due: formatDate(invoice.dueDate),
              })}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <a href={`/api/invoices/${invoice.id}/pdf`} download>
              {translate("downloadPdf")}
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
                title={translate("voidTitle", { number: invoice.number })}
                description={translate("voidDescription")}
                confirmLabel={translate("voidConfirm")}
                formId={`void-invoice-${invoice.id}`}
              >
                <Button type="button" variant="outline">
                  {translate("void")}
                </Button>
              </ConfirmDialog>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{translate("billedTo")}</CardTitle>
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
                {translate("location", { name: invoice.location.name })}
              </span>
            ) : null}
            {invoice.enrollment ? (
              <span className="text-muted-foreground text-xs">
                {translate("enrollment", {
                  plan: invoice.enrollment.plan.name,
                })}
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
            <CardTitle>{translate("summary")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {invoice.taxCents > 0 ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {translate("subtotal")}
                  </span>
                  <span>
                    {formatMoney(
                      invoice.financials.totalCents - invoice.taxCents,
                      currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {invoice.taxLabel ?? translate("tax")}
                  </span>
                  <span>{formatMoney(invoice.taxCents, currency)}</span>
                </div>
              </>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {translate("total")}
              </span>
              <span>
                {formatMoney(invoice.financials.totalCents, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{translate("paid")}</span>
              <span>{formatMoney(invoice.financials.paidCents, currency)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>{translate("balance")}</span>
              <span>
                {formatMoney(invoice.financials.balanceCents, currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translate("lineItems")}</CardTitle>
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
          <CardTitle>{translate("payments")}</CardTitle>
          <CardDescription>
            {invoice.payments.length === 0
              ? translate("noPayments")
              : translate("paymentsRecorded", {
                  count: invoice.payments.length,
                })}
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
                  {translateInvoices(`paymentMethod.${payment.method}`)} ·{" "}
                  {formatDate(payment.paidAt)}
                  {payment.recordedBy
                    ? ` · ${translate("by", { name: payment.recordedBy.name })}`
                    : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {payment.reference ? (
                  <span className="text-muted-foreground max-w-[14rem] truncate text-xs">
                    {translate("reference", { reference: payment.reference })}
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
                      title={translate("deleteTitle")}
                      description={translate("deleteDescription")}
                      confirmLabel={translate("delete")}
                      formId={`delete-payment-${payment.id}`}
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                      >
                        {translate("delete")}
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

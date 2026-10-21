import { Document, Page, Text, View } from "@react-pdf/renderer";

import { formatMoney, formatDate, formatDateUtc } from "@/lib/utils";

import { PdfBrandHeader, pdfStyles, type PdfBrand } from "./brand";
import type { InvoicePdfLabels } from "./labels";

// Data shaping is pure (unit-tested); the document component only renders.

export type InvoicePdfItem = {
  description: string;
  quantity: number;
  unitPriceCents: number;
};

export type InvoicePdfPayment = {
  amountCents: number;
  method: string;
  paidAt: Date;
  reference: string | null;
};

export type InvoicePdfInput = {
  number: number;
  status: string;
  issueDate: Date;
  dueDate: Date;
  locationName: string | null;
  notes: string | null;
  studentName: string;
  items: InvoicePdfItem[];
  payments: InvoicePdfPayment[];
  currency: string;
  taxCents?: number;
  taxLabel?: string | null;
};

export type InvoicePdfData = InvoicePdfInput & {
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  isOverdue: boolean;
};

// Pure shaping: totals and derived status, computed once for render + tests.
// `now` is injectable so the overdue derivation is testable.
export function shapeInvoiceForPdf(
  input: InvoicePdfInput,
  now: Date = new Date(),
): InvoicePdfData {
  const subtotalCents = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
  const totalCents = subtotalCents + (input.taxCents ?? 0);
  const paidCents = input.payments.reduce(
    (sum, payment) => sum + payment.amountCents,
    0,
  );
  const balanceCents = totalCents - paidCents;
  const isOverdue =
    input.status === "OPEN" &&
    input.dueDate.getTime() < startOfToday(now).getTime();

  return { ...input, totalCents, paidCents, balanceCents, isOverdue };
}

function startOfToday(now: Date): Date {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date;
}

const CELL_DESC = { flex: 1 };
const CELL_NUM = { width: 60, textAlign: "right" as const };
const CELL_MONEY = { width: 90, textAlign: "right" as const };

export function paymentMethodLabel(
  method: string,
  labels: Record<string, string>,
): string {
  return labels[method] ?? method;
}

function statusLabel(data: InvoicePdfData, labels: InvoicePdfLabels): string {
  if (data.status === "VOID") return labels.statusVoid;
  if (data.status === "PAID") return labels.statusPaid;
  return data.isOverdue ? labels.statusOverdue : labels.statusOpen;
}

export function InvoicePdfDocument({
  brand,
  data,
  labels,
}: {
  brand: PdfBrand;
  data: InvoicePdfData;
  labels: InvoicePdfLabels;
}) {
  const money = (cents: number) =>
    formatMoney(cents, data.currency, labels.locale);

  return (
    <Document title={`${labels.title} ${data.number}`} author={brand.orgName}>
      <Page
        size="A4"
        style={[
          pdfStyles.page,
          { fontFamily: labels.fontFamily, direction: labels.direction },
        ]}
      >
        <PdfBrandHeader brand={brand} />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontWeight: "bold", fontSize: 16 }}>
              {labels.title} #{data.number}
            </Text>
            <Text style={pdfStyles.muted}>{data.studentName}</Text>
            {data.locationName ? (
              <Text style={pdfStyles.muted}>{data.locationName}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text>
              {labels.issued}: {formatDateUtc(data.issueDate, labels.locale)} ·{" "}
              {labels.due}: {formatDate(data.dueDate, labels.locale)}
            </Text>
            <Text
              style={{
                fontWeight: "bold",
                color: data.isOverdue ? "#b91c1c" : brand.accentHex,
              }}
            >
              {statusLabel(data, labels)}
            </Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionTitle}>{labels.lineItems}</Text>
        <View style={pdfStyles.tableHeader}>
          <Text style={CELL_DESC}>{labels.description}</Text>
          <Text style={CELL_NUM}>{labels.quantity}</Text>
          <Text style={CELL_MONEY}>{labels.amount}</Text>
        </View>
        {data.items.map((item, index) => (
          <View key={index} style={pdfStyles.tableRow} wrap={false}>
            <Text style={CELL_DESC}>{item.description}</Text>
            <Text style={CELL_NUM}>{item.quantity}</Text>
            <Text style={CELL_MONEY}>
              {money(item.quantity * item.unitPriceCents)}
            </Text>
          </View>
        ))}
        {(data.taxCents ?? 0) > 0 ? (
          <>
            <View style={pdfStyles.tableRow}>
              <Text style={CELL_DESC}>{labels.subtotal}</Text>
              <Text style={CELL_MONEY}>
                {money(data.totalCents - (data.taxCents ?? 0))}
              </Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={CELL_DESC}>
                {data.taxLabel ?? labels.taxFallback}
              </Text>
              <Text style={CELL_MONEY}>{money(data.taxCents ?? 0)}</Text>
            </View>
          </>
        ) : null}
        <View style={[pdfStyles.tableRow, { fontWeight: "bold" }]}>
          <Text style={CELL_DESC}>{labels.total}</Text>
          <Text style={CELL_MONEY}>{money(data.totalCents)}</Text>
        </View>

        <Text style={pdfStyles.sectionTitle}>{labels.payments}</Text>
        {data.payments.length === 0 ? (
          <Text style={pdfStyles.muted}>{labels.noPayments}</Text>
        ) : (
          <>
            <View style={pdfStyles.tableHeader}>
              <Text style={CELL_DESC}>{labels.date}</Text>
              <Text style={CELL_DESC}>{labels.method}</Text>
              <Text style={CELL_DESC}>{labels.reference}</Text>
              <Text style={CELL_MONEY}>{labels.amount}</Text>
            </View>
            {data.payments.map((payment, index) => (
              <View key={index} style={pdfStyles.tableRow} wrap={false}>
                <Text style={CELL_DESC}>
                  {formatDate(payment.paidAt, labels.locale)}
                </Text>
                <Text style={CELL_DESC}>
                  {paymentMethodLabel(payment.method, labels.paymentMethods)}
                </Text>
                <Text style={CELL_DESC}>{payment.reference ?? "—"}</Text>
                <Text style={CELL_MONEY}>{money(payment.amountCents)}</Text>
              </View>
            ))}
          </>
        )}

        <View
          style={[pdfStyles.tableRow, { fontWeight: "bold", marginTop: 8 }]}
        >
          <Text style={CELL_DESC}>{labels.balanceDue}</Text>
          <Text style={CELL_MONEY}>{money(data.balanceCents)}</Text>
        </View>

        {data.notes ? (
          <>
            <Text style={pdfStyles.sectionTitle}>{labels.notes}</Text>
            <Text>{data.notes}</Text>
          </>
        ) : null}

        <Text style={pdfStyles.footer} fixed>
          {labels.footer(
            brand.orgName,
            data.number,
            formatDate(new Date(), labels.locale),
          )}
        </Text>
      </Page>
    </Document>
  );
}

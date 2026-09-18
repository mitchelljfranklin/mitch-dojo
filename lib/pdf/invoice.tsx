import { Document, Page, Text, View } from "@react-pdf/renderer";

import { formatMoney, formatDate } from "@/lib/utils";

import { PdfBrandHeader, pdfStyles, type PdfBrand } from "./brand";

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
  const totalCents = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
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

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  CARD_TERMINAL: "Card terminal",
  OTHER: "Other",
};

export function paymentMethodLabel(method: string): string {
  return METHOD_LABELS[method] ?? method;
}

function statusLabel(data: InvoicePdfData): string {
  if (data.status === "VOID") return "Void";
  if (data.status === "PAID") return "Paid";
  return data.isOverdue ? "Overdue" : "Open";
}

export function InvoicePdfDocument({
  brand,
  data,
}: {
  brand: PdfBrand;
  data: InvoicePdfData;
}) {
  const money = (cents: number) => formatMoney(cents, data.currency);

  return (
    <Document title={`Invoice ${data.number}`} author={brand.orgName}>
      <Page size="A4" style={pdfStyles.page}>
        <PdfBrandHeader brand={brand} />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 16 }}>
              Invoice #{data.number}
            </Text>
            <Text style={pdfStyles.muted}>{data.studentName}</Text>
            {data.locationName ? (
              <Text style={pdfStyles.muted}>{data.locationName}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text>
              Issued: {formatDate(data.issueDate)} · Due:{" "}
              {formatDate(data.dueDate)}
            </Text>
            <Text
              style={{
                fontFamily: "Helvetica-Bold",
                color: data.isOverdue ? "#b91c1c" : brand.accentHex,
              }}
            >
              {statusLabel(data)}
            </Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionTitle}>Line items</Text>
        <View style={pdfStyles.tableHeader}>
          <Text style={CELL_DESC}>Description</Text>
          <Text style={CELL_NUM}>Qty</Text>
          <Text style={CELL_MONEY}>Amount</Text>
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
        <View style={[pdfStyles.tableRow, { fontFamily: "Helvetica-Bold" }]}>
          <Text style={CELL_DESC}>Total</Text>
          <Text style={CELL_MONEY}>{money(data.totalCents)}</Text>
        </View>

        <Text style={pdfStyles.sectionTitle}>Payments</Text>
        {data.payments.length === 0 ? (
          <Text style={pdfStyles.muted}>No payments recorded yet.</Text>
        ) : (
          <>
            <View style={pdfStyles.tableHeader}>
              <Text style={CELL_DESC}>Date</Text>
              <Text style={CELL_DESC}>Method</Text>
              <Text style={CELL_DESC}>Reference</Text>
              <Text style={CELL_MONEY}>Amount</Text>
            </View>
            {data.payments.map((payment, index) => (
              <View key={index} style={pdfStyles.tableRow} wrap={false}>
                <Text style={CELL_DESC}>{formatDate(payment.paidAt)}</Text>
                <Text style={CELL_DESC}>
                  {paymentMethodLabel(payment.method)}
                </Text>
                <Text style={CELL_DESC}>{payment.reference ?? "—"}</Text>
                <Text style={CELL_MONEY}>{money(payment.amountCents)}</Text>
              </View>
            ))}
          </>
        )}

        <View
          style={[
            pdfStyles.tableRow,
            { fontFamily: "Helvetica-Bold", marginTop: 8 },
          ]}
        >
          <Text style={CELL_DESC}>Balance due</Text>
          <Text style={CELL_MONEY}>{money(data.balanceCents)}</Text>
        </View>

        {data.notes ? (
          <>
            <Text style={pdfStyles.sectionTitle}>Notes</Text>
            <Text>{data.notes}</Text>
          </>
        ) : null}

        <Text style={pdfStyles.footer} fixed>
          Generated by {brand.orgName} — invoice #{data.number} ·{" "}
          {formatDate(new Date())}
        </Text>
      </Page>
    </Document>
  );
}

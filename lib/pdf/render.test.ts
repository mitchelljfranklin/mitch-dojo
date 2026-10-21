import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";

import { AgreementPdfDocument, shapeAgreementPdf } from "./agreement";
import {
  AttendanceSheetPdfDocument,
  shapeAttendanceSheet,
} from "./attendance-sheet";
import type { PdfBrand } from "./brand";
import { InvoicePdfDocument, shapeInvoiceForPdf } from "./invoice";
import type {
  AgreementPdfLabels,
  AttendancePdfLabels,
  InvoicePdfLabels,
  ReportCardPdfLabels,
} from "./labels";
import { ReportCardPdfDocument, shapeReportCard } from "./report-card";

const BRAND: PdfBrand = {
  orgName: "Northside Dojo",
  logoDataUrl: null,
  accentHex: "#18181b",
};

const INVOICE_LABELS: InvoicePdfLabels = {
  locale: "es",
  title: "Factura",
  issued: "Emitida",
  due: "Vence",
  statusVoid: "Anulada",
  statusPaid: "Pagada",
  statusOverdue: "Vencida",
  statusOpen: "Abierta",
  lineItems: "Conceptos",
  description: "Descripción",
  quantity: "Cant.",
  amount: "Importe",
  subtotal: "Subtotal",
  taxFallback: "Impuesto",
  total: "Total",
  payments: "Pagos",
  noPayments: "Todavía no hay pagos registrados.",
  date: "Fecha",
  method: "Método",
  reference: "Referencia",
  balanceDue: "Saldo pendiente",
  notes: "Notas",
  paymentMethods: {
    CASH: "Efectivo",
    BANK_TRANSFER: "Transferencia bancaria",
    CARD_TERMINAL: "Terminal de tarjeta",
    OTHER: "Otro",
  },
  footer: (orgName, number, date) =>
    `Generado por ${orgName} — factura #${number} · ${date}`,
};

const REPORT_CARD_LABELS: ReportCardPdfLabels = {
  locale: "es",
  documentSuffix: "informe de progreso",
  currentRank: "Rango actual",
  noBelts: "Sin cinturones.",
  since: "desde",
  trainingSummary: "Resumen de entrenamiento",
  sessionsAllTime: "Sesiones asistidas (total)",
  sessionsLast30: "Sesiones asistidas (últimos 30 días)",
  balanceDue: "Saldo pendiente",
  beltHistory: "Historial de cinturones",
  noHistory: "Sin historial.",
  belt: "Cinturón",
  discipline: "Disciplina",
  awarded: "Otorgado",
  progressLine: (date) => `Informe generado el ${date}`,
  footer: (orgName, studentName) =>
    `${orgName} — informe de progreso de ${studentName}`,
};

const ATTENDANCE_LABELS: AttendancePdfLabels = {
  locale: "es",
  title: "Asistencia",
  trainer: "Instructor",
  cancelled: "Sesión cancelada.",
  roster: "Lista",
  student: "Alumno",
  status: "Estado",
  noStudents: "Sin alumnos.",
  statuses: {
    PRESENT: "Presente",
    LATE: "Tarde",
    EXCUSED: "Justificado",
    ABSENT: "Ausente",
  },
  studentCount: (count) => `${count} alumnos`,
  notMarked: (count) => `${count} sin marcar`,
  totals: (present, trained) => `${present} presentes · ${trained} entrenados`,
  footer: (orgName, courseName, date) =>
    `${orgName} — asistencia de ${courseName} el ${date}`,
};

const AGREEMENT_LABELS: AgreementPdfLabels = {
  locale: "es",
  member: "Miembro (o tutor)",
  signature: "Firma",
  date: "Fecha",
  dateSigned: "Fecha de firma",
  versionLine: (version) => `versión ${version}`,
  footer: (orgName, title, version, studentName) =>
    `${orgName} — ${title} (v${version}) de ${studentName}`,
};

function startsWithPdf(buffer: Awaited<ReturnType<typeof renderToBuffer>>) {
  return Buffer.from(buffer).subarray(0, 4).toString() === "%PDF";
}

describe("PDF documents", () => {
  it("renders an invoice with localized labels", async () => {
    const data = shapeInvoiceForPdf({
      number: 42,
      status: "OPEN",
      issueDate: new Date("2026-09-01"),
      dueDate: new Date("2026-09-15"),
      locationName: "Sede Norte",
      notes: null,
      studentName: "Alumno Pdf",
      items: [
        { description: "Mensualidad", quantity: 1, unitPriceCents: 9500 },
      ],
      payments: [
        {
          amountCents: 5000,
          method: "CASH",
          paidAt: new Date("2026-09-05"),
          reference: null,
        },
      ],
      currency: "USD",
      taxCents: 500,
      taxLabel: "IVA",
    });
    const buffer = await renderToBuffer(
      createElement(InvoicePdfDocument, {
        brand: BRAND,
        data,
        labels: INVOICE_LABELS,
      }) as ReactElement<DocumentProps>,
    );
    expect(startsWithPdf(buffer)).toBe(true);
  });

  it("renders a report card with localized labels", async () => {
    const data = shapeReportCard({
      studentName: "Alumno Pdf",
      photoDataUrl: null,
      belts: [
        {
          disciplineName: "Kárate",
          beltName: "Amarillo",
          colorHex: "#facc15",
          awardedAt: new Date("2026-06-01"),
        },
      ],
      trainedTotal: 12,
      trainedLast30Days: 3,
      balanceCents: 0,
      currency: "USD",
      generatedAt: new Date("2026-10-21"),
    });
    const buffer = await renderToBuffer(
      createElement(ReportCardPdfDocument, {
        brand: BRAND,
        data,
        labels: REPORT_CARD_LABELS,
      }) as ReactElement<DocumentProps>,
    );
    expect(startsWithPdf(buffer)).toBe(true);
  });

  it("renders an attendance sheet with localized labels", async () => {
    const data = shapeAttendanceSheet({
      courseName: "Kárate infantil",
      locationName: "Sede Norte",
      trainerName: "Sensei",
      date: new Date("2026-10-21"),
      startTime: "18:00",
      endTime: "19:00",
      status: "SCHEDULED",
      entries: [
        { name: "Alumno Pdf", status: "PRESENT" },
        { name: "Otro Alumno", status: null },
      ],
      generatedAt: new Date("2026-10-21"),
    });
    const buffer = await renderToBuffer(
      createElement(AttendanceSheetPdfDocument, {
        brand: BRAND,
        data,
        labels: ATTENDANCE_LABELS,
      }) as ReactElement<DocumentProps>,
    );
    expect(startsWithPdf(buffer)).toBe(true);
  });

  it("renders an agreement with localized labels", async () => {
    const data = shapeAgreementPdf({
      documentTitle: "Código de conducta",
      version: 2,
      bodyMarkdown: "# Normas\nSé respetuoso.",
      studentName: "Alumno Pdf",
      orgName: "Northside Dojo",
    });
    const buffer = await renderToBuffer(
      createElement(AgreementPdfDocument, {
        brand: BRAND,
        data,
        labels: AGREEMENT_LABELS,
      }) as ReactElement<DocumentProps>,
    );
    expect(startsWithPdf(buffer)).toBe(true);
  });
});

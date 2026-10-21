import { getLocale, getTranslations } from "next-intl/server";

import { pdfFontFamily, type PdfFontFamily } from "./fonts";

// PDFs render outside the React tree (react-pdf), so labels are resolved here
// and passed in as plain values. The locale follows the request cookie, with
// the school default as the fallback chosen by the request config. Each
// document also receives its bundled Noto font family and text direction.

export type InvoicePdfLabels = {
  locale: string;
  fontFamily: PdfFontFamily;
  direction: "ltr" | "rtl";
  title: string;
  issued: string;
  due: string;
  statusVoid: string;
  statusPaid: string;
  statusOverdue: string;
  statusOpen: string;
  lineItems: string;
  description: string;
  quantity: string;
  amount: string;
  subtotal: string;
  taxFallback: string;
  total: string;
  payments: string;
  noPayments: string;
  date: string;
  method: string;
  reference: string;
  balanceDue: string;
  notes: string;
  paymentMethods: Record<string, string>;
  footer: (orgName: string, number: number, date: string) => string;
};

export async function getInvoicePdfLabels(): Promise<InvoicePdfLabels> {
  const locale = await getLocale();
  const translate = await getTranslations({ locale, namespace: "Pdf" });

  return {
    locale,
    fontFamily: pdfFontFamily(locale),
    direction: locale === "ar" ? "rtl" : "ltr",
    title: translate("invoice.title"),
    issued: translate("invoice.issued"),
    due: translate("invoice.due"),
    statusVoid: translate("invoice.statusVoid"),
    statusPaid: translate("invoice.statusPaid"),
    statusOverdue: translate("invoice.statusOverdue"),
    statusOpen: translate("invoice.statusOpen"),
    lineItems: translate("invoice.lineItems"),
    description: translate("invoice.description"),
    quantity: translate("invoice.quantity"),
    amount: translate("invoice.amount"),
    subtotal: translate("invoice.subtotal"),
    taxFallback: translate("invoice.taxFallback"),
    total: translate("invoice.total"),
    payments: translate("invoice.payments"),
    noPayments: translate("invoice.noPayments"),
    date: translate("invoice.date"),
    method: translate("invoice.method"),
    reference: translate("invoice.reference"),
    balanceDue: translate("invoice.balanceDue"),
    notes: translate("invoice.notes"),
    paymentMethods: {
      CASH: translate("paymentMethods.CASH"),
      BANK_TRANSFER: translate("paymentMethods.BANK_TRANSFER"),
      CARD_TERMINAL: translate("paymentMethods.CARD_TERMINAL"),
      OTHER: translate("paymentMethods.OTHER"),
    },
    footer: (orgName, number, date) =>
      translate("invoice.footer", { org: orgName, number, date }),
  };
}

export type ReportCardPdfLabels = {
  locale: string;
  fontFamily: PdfFontFamily;
  direction: "ltr" | "rtl";
  documentSuffix: string;
  currentRank: string;
  noBelts: string;
  since: string;
  trainingSummary: string;
  sessionsAllTime: string;
  sessionsLast30: string;
  balanceDue: string;
  beltHistory: string;
  noHistory: string;
  belt: string;
  discipline: string;
  awarded: string;
  progressLine: (date: string) => string;
  footer: (orgName: string, studentName: string) => string;
};

export async function getReportCardPdfLabels(): Promise<ReportCardPdfLabels> {
  const locale = await getLocale();
  const translate = await getTranslations({ locale, namespace: "Pdf" });

  return {
    locale,
    fontFamily: pdfFontFamily(locale),
    direction: locale === "ar" ? "rtl" : "ltr",
    documentSuffix: translate("reportCard.documentSuffix"),
    currentRank: translate("reportCard.currentRank"),
    noBelts: translate("reportCard.noBelts"),
    since: translate("reportCard.since"),
    trainingSummary: translate("reportCard.trainingSummary"),
    sessionsAllTime: translate("reportCard.sessionsAllTime"),
    sessionsLast30: translate("reportCard.sessionsLast30"),
    balanceDue: translate("reportCard.balanceDue"),
    beltHistory: translate("reportCard.beltHistory"),
    noHistory: translate("reportCard.noHistory"),
    belt: translate("reportCard.belt"),
    discipline: translate("reportCard.discipline"),
    awarded: translate("reportCard.awarded"),
    progressLine: (date) => translate("reportCard.progressLine", { date }),
    footer: (orgName, studentName) =>
      translate("reportCard.footer", { org: orgName, student: studentName }),
  };
}

export type AttendancePdfLabels = {
  locale: string;
  fontFamily: PdfFontFamily;
  direction: "ltr" | "rtl";
  title: string;
  trainer: string;
  cancelled: string;
  roster: string;
  student: string;
  status: string;
  noStudents: string;
  statuses: Record<string, string>;
  studentCount: (count: number) => string;
  notMarked: (count: number) => string;
  totals: (present: number, trained: number) => string;
  footer: (orgName: string, courseName: string, date: string) => string;
};

export async function getAttendancePdfLabels(): Promise<AttendancePdfLabels> {
  const locale = await getLocale();
  const translate = await getTranslations({ locale, namespace: "Pdf" });

  return {
    locale,
    fontFamily: pdfFontFamily(locale),
    direction: locale === "ar" ? "rtl" : "ltr",
    title: translate("attendance.title"),
    trainer: translate("attendance.trainer"),
    cancelled: translate("attendance.cancelled"),
    roster: translate("attendance.roster"),
    student: translate("attendance.student"),
    status: translate("attendance.status"),
    noStudents: translate("attendance.noStudents"),
    statuses: {
      PRESENT: translate("attendanceStatuses.PRESENT"),
      LATE: translate("attendanceStatuses.LATE"),
      EXCUSED: translate("attendanceStatuses.EXCUSED"),
      ABSENT: translate("attendanceStatuses.ABSENT"),
    },
    studentCount: (count) => translate("attendance.studentCount", { count }),
    notMarked: (count) => translate("attendance.notMarked", { count }),
    totals: (present, trained) =>
      translate("attendance.totals", { present, trained }),
    footer: (orgName, courseName, date) =>
      translate("attendance.footer", {
        org: orgName,
        course: courseName,
        date,
      }),
  };
}

export type AgreementPdfLabels = {
  locale: string;
  fontFamily: PdfFontFamily;
  direction: "ltr" | "rtl";
  member: string;
  signature: string;
  date: string;
  dateSigned: string;
  versionLine: (version: number) => string;
  footer: (
    orgName: string,
    title: string,
    version: number,
    studentName: string,
  ) => string;
};

export async function getAgreementPdfLabels(): Promise<AgreementPdfLabels> {
  const locale = await getLocale();
  const translate = await getTranslations({ locale, namespace: "Pdf" });

  return {
    locale,
    fontFamily: pdfFontFamily(locale),
    direction: locale === "ar" ? "rtl" : "ltr",
    member: translate("agreement.member"),
    signature: translate("agreement.signature"),
    date: translate("agreement.date"),
    dateSigned: translate("agreement.dateSigned"),
    versionLine: (version) => translate("agreement.version", { version }),
    footer: (orgName, title, version, studentName) =>
      translate("agreement.footer", {
        org: orgName,
        title,
        version,
        student: studentName,
      }),
  };
}

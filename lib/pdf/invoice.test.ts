import { describe, expect, it } from "vitest";

import {
  paymentMethodLabel,
  shapeInvoiceForPdf,
  type InvoicePdfInput,
} from "./invoice";

const BASE_INPUT: InvoicePdfInput = {
  number: 42,
  status: "OPEN",
  issueDate: new Date("2026-09-01"),
  dueDate: new Date("2026-09-15"),
  locationName: "Northside Dojo",
  notes: null,
  studentName: "Sam Carter",
  items: [
    { description: "Kids monthly", quantity: 1, unitPriceCents: 9500 },
    { description: "Gi", quantity: 2, unitPriceCents: 2500 },
  ],
  payments: [
    { amountCents: 5000, method: "CASH", paidAt: new Date(), reference: null },
  ],
  currency: "USD",
};

describe("shapeInvoiceForPdf", () => {
  it("computes totals, paid, and balance", () => {
    const data = shapeInvoiceForPdf(BASE_INPUT, new Date("2026-09-10"));
    expect(data.totalCents).toBe(14500);
    expect(data.paidCents).toBe(5000);
    expect(data.balanceCents).toBe(9500);
  });

  it("marks OPEN invoices past their due date as overdue", () => {
    const data = shapeInvoiceForPdf(BASE_INPUT, new Date("2026-09-16"));
    expect(data.isOverdue).toBe(true);
  });

  it("does not mark invoices due today as overdue", () => {
    const data = shapeInvoiceForPdf(
      BASE_INPUT,
      new Date("2026-09-15T10:00:00"),
    );
    expect(data.isOverdue).toBe(false);
  });

  it("never marks PAID invoices as overdue, even far past due", () => {
    const data = shapeInvoiceForPdf(
      { ...BASE_INPUT, status: "PAID" },
      new Date("2026-12-01"),
    );
    expect(data.isOverdue).toBe(false);
  });

  it("handles an invoice with no items or payments", () => {
    const data = shapeInvoiceForPdf(
      { ...BASE_INPUT, items: [], payments: [] },
      new Date("2026-09-10"),
    );
    expect(data.totalCents).toBe(0);
    expect(data.balanceCents).toBe(0);
  });
});

describe("paymentMethodLabel", () => {
  it("maps known methods to friendly labels", () => {
    expect(paymentMethodLabel("CASH")).toBe("Cash");
    expect(paymentMethodLabel("BANK_TRANSFER")).toBe("Bank transfer");
    expect(paymentMethodLabel("CARD_TERMINAL")).toBe("Card terminal");
    expect(paymentMethodLabel("OTHER")).toBe("Other");
  });

  it("falls back to the raw value for unknown methods", () => {
    expect(paymentMethodLabel("SOMETHING")).toBe("SOMETHING");
  });
});

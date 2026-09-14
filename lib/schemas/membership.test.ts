import { describe, expect, it } from "vitest";

import {
  membershipPlanSchema,
  paymentSchema,
  priceInputSchema,
} from "./membership";

describe("priceInputSchema", () => {
  it("converts major units to integer cents", () => {
    expect(priceInputSchema.parse("89.50")).toBe(8950);
    expect(priceInputSchema.parse("0")).toBe(0);
    expect(priceInputSchema.parse("10.5")).toBe(1050);
  });

  it("rejects malformed prices", () => {
    expect(priceInputSchema.safeParse("").success).toBe(false);
    expect(priceInputSchema.safeParse("abc").success).toBe(false);
    expect(priceInputSchema.safeParse("1.234").success).toBe(false);
    expect(priceInputSchema.safeParse("-5").success).toBe(false);
  });
});

describe("membershipPlanSchema", () => {
  it("requires a billing period for recurring plans", () => {
    const result = membershipPlanSchema.safeParse({
      name: "Monthly training",
      description: "",
      planType: "RECURRING",
      price: "89.50",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("billing period");
    }
  });

  it("accepts a recurring plan with a billing period", () => {
    const result = membershipPlanSchema.safeParse({
      name: "Monthly training",
      description: "",
      planType: "RECURRING",
      billingPeriod: "MONTHLY",
      price: "89.50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(8950);
    }
  });

  it("accepts a one-off item without a billing period", () => {
    const result = membershipPlanSchema.safeParse({
      name: "Grading fee",
      description: "",
      planType: "ITEM",
      price: "40",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.billingPeriod).toBeUndefined();
    }
  });
});

describe("paymentSchema", () => {
  it("rejects zero or malformed amounts", () => {
    expect(
      paymentSchema.safeParse({
        amount: "0",
        method: "CASH",
        paidAt: "2026-09-14",
      }).success,
    ).toBe(false);
    expect(
      paymentSchema.safeParse({
        amount: "abc",
        method: "CASH",
        paidAt: "2026-09-14",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid payment", () => {
    const result = paymentSchema.safeParse({
      amount: "50.00",
      method: "BANK_TRANSFER",
      paidAt: "2026-09-14",
      reference: "TRX-1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(5000);
      expect(result.data.reference).toBe("TRX-1");
    }
  });
});

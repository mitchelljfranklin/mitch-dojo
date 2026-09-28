import { describe, expect, it } from "vitest";

import {
  verificationRecordSchema,
  verificationTypeSchema,
} from "./verification";

describe("verificationTypeSchema", () => {
  it("defaults flags and normalises blank fields", () => {
    const parsed = verificationTypeSchema.parse({ name: "First Aid" });
    expect(parsed.required).toBe(false);
    expect(parsed.requiresExpiry).toBe(false);
    expect(parsed.defaultValidityMonths).toBeNull();
    expect(parsed.description).toBeNull();
    expect(parsed.isActive).toBe(true);
  });

  it("accepts a validity period", () => {
    const parsed = verificationTypeSchema.parse({
      name: "First Aid",
      defaultValidityMonths: "24",
    });
    expect(parsed.defaultValidityMonths).toBe(24);
  });

  it("requires a name", () => {
    expect(verificationTypeSchema.safeParse({ name: "  " }).success).toBe(
      false,
    );
  });
});

describe("verificationRecordSchema", () => {
  it("accepts a full record", () => {
    const parsed = verificationRecordSchema.parse({
      trainerId: "t1",
      typeId: "v1",
      referenceNumber: "BC-123",
      issuedAt: "2024-01-01",
      expiresAt: "2027-01-01",
      notes: "Scanned",
    });
    expect(parsed.referenceNumber).toBe("BC-123");
    expect(parsed.expiresAt).toBe("2027-01-01");
  });

  it("requires trainer and type ids", () => {
    expect(
      verificationRecordSchema.safeParse({ trainerId: "", typeId: "" }).success,
    ).toBe(false);
  });

  it("rejects an impossible date", () => {
    expect(
      verificationRecordSchema.safeParse({
        trainerId: "t1",
        typeId: "v1",
        expiresAt: "2026-02-31",
      }).success,
    ).toBe(false);
  });
});

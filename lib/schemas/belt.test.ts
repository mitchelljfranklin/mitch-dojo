import { describe, expect, it } from "vitest";

import { beltLevelSchema, promotionSchema } from "@/lib/schemas/belt";

describe("beltLevelSchema", () => {
  const base = { name: "Yellow", order: "1", requiredTrainings: "20" };

  it("accepts 3- and 6-digit hex colours and uppercases them", () => {
    const six = beltLevelSchema.safeParse({ ...base, colorHex: "#ffaa00" });
    expect(six.success).toBe(true);
    if (six.success) expect(six.data.colorHex).toBe("#FFAA00");

    const three = beltLevelSchema.safeParse({ ...base, colorHex: "#fff" });
    expect(three.success).toBe(true);
    if (three.success) expect(three.data.colorHex).toBe("#FFF");
  });

  it("rejects invalid hex colours", () => {
    const result = beltLevelSchema.safeParse({ ...base, colorHex: "yellow" });
    expect(result.success).toBe(false);
  });

  it("coerces numeric fields", () => {
    const result = beltLevelSchema.safeParse({
      name: "White",
      colorHex: "#ffffff",
      order: "0",
      requiredTrainings: "0",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe(0);
      expect(result.data.requiredTrainings).toBe(0);
    }
  });

  it("requires a name", () => {
    const result = beltLevelSchema.safeParse({
      name: "  ",
      colorHex: "#fff",
      order: "0",
    });
    expect(result.success).toBe(false);
  });
});

describe("promotionSchema", () => {
  it("requires a belt level and a valid date", () => {
    const missingBelt = promotionSchema.safeParse({
      beltLevelId: "",
      awardedAt: "2026-09-13",
    });
    expect(missingBelt.success).toBe(false);
  });

  it("rejects invalid dates", () => {
    const result = promotionSchema.safeParse({
      beltLevelId: "belt-1",
      awardedAt: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid promotion", () => {
    const result = promotionSchema.safeParse({
      beltLevelId: "belt-1",
      awardedAt: "2026-09-13",
      notes: "  Grading day  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("Grading day");
    }
  });
});

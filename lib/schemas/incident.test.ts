import { describe, expect, it } from "vitest";

import { incidentFormSchema } from "./incident";

const BASE = {
  title: "Ankle sprain",
  occurredAt: "2026-09-01",
  description: "Landed awkwardly during sparring.",
};

describe("incidentFormSchema", () => {
  it("defaults severity and the optional fields", () => {
    const parsed = incidentFormSchema.parse(BASE);
    expect(parsed.severity).toBe("MINOR");
    expect(parsed.studentId).toBeNull();
    expect(parsed.locationId).toBeNull();
    expect(parsed.injuryDescription).toBeNull();
    expect(parsed.medicalAttentionRequired).toBe(false);
  });

  it("requires a title and description", () => {
    expect(incidentFormSchema.safeParse({ ...BASE, title: "  " }).success).toBe(
      false,
    );
    expect(
      incidentFormSchema.safeParse({ ...BASE, description: "" }).success,
    ).toBe(false);
  });

  it("rejects an impossible date", () => {
    expect(
      incidentFormSchema.safeParse({ ...BASE, occurredAt: "2026-02-31" })
        .success,
    ).toBe(false);
  });

  it("accepts a full report", () => {
    const parsed = incidentFormSchema.parse({
      ...BASE,
      severity: "SERIOUS",
      studentId: "stu_1",
      locationId: "loc_1",
      injuryDescription: "Swollen ankle",
      treatmentGiven: "Ice and elevation",
      medicalAttentionRequired: true,
      actionsTaken: "Called guardian",
    });
    expect(parsed.severity).toBe("SERIOUS");
    expect(parsed.studentId).toBe("stu_1");
    expect(parsed.medicalAttentionRequired).toBe(true);
  });
});

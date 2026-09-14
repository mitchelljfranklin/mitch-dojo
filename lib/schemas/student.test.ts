import { describe, expect, it } from "vitest";

import {
  studentSchema,
  studentCsvRowSchema,
  STUDENT_STATUSES,
} from "@/lib/schemas/student";
import { locationSchema } from "@/lib/schemas/location";

describe("studentSchema", () => {
  const baseInput = {
    firstName: "Aiko",
    lastName: "Tanaka",
    email: "",
    phone: "",
    dateOfBirth: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    guardianName: "",
    guardianEmail: "",
    guardianPhone: "",
    status: "TRIAL",
    notes: "",
  };

  it("requires at least one location", () => {
    const result = studentSchema.safeParse({
      ...baseInput,
      locationIds: [],
      primaryLocationId: "",
      disciplineIds: ["disc-1"],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one discipline", () => {
    const result = studentSchema.safeParse({
      ...baseInput,
      locationIds: ["loc-1"],
      primaryLocationId: "loc-1",
      disciplineIds: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("discipline");
    }
  });

  it("rejects a primary location outside the assigned set", () => {
    const result = studentSchema.safeParse({
      ...baseInput,
      locationIds: ["loc-1"],
      disciplineIds: ["disc-1"],
      primaryLocationId: "loc-2",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid input and normalises empty strings to null", () => {
    const result = studentSchema.safeParse({
      ...baseInput,
      email: "",
      phone: " ",
      locationIds: ["loc-1", "loc-2"],
      disciplineIds: ["disc-1", "disc-2"],
      primaryLocationId: "loc-1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
      expect(result.data.phone).toBeNull();
      expect(result.data.status).toBe("TRIAL");
    }
  });

  it("parses a valid date of birth and rejects garbage dates", () => {
    const valid = studentSchema.safeParse({
      ...baseInput,
      dateOfBirth: "2012-05-14",
      locationIds: ["loc-1"],
      disciplineIds: ["disc-1"],
      primaryLocationId: "loc-1",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.dateOfBirth?.toISOString()).toBe(
        "2012-05-14T00:00:00.000Z",
      );
    }

    const invalid = studentSchema.safeParse({
      ...baseInput,
      dateOfBirth: "not-a-date",
      locationIds: ["loc-1"],
      disciplineIds: ["disc-1"],
      primaryLocationId: "loc-1",
    });
    expect(invalid.success).toBe(true);
    if (invalid.success) {
      expect(invalid.data.dateOfBirth).toBeNull();
    }
  });
});

describe("studentCsvRowSchema", () => {
  it("defaults status to TRIAL when missing", () => {
    const result = studentCsvRowSchema.safeParse({
      firstName: "Mei",
      lastName: "Watanabe",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("TRIAL");
    }
  });

  it("uppercases a valid status", () => {
    const result = studentCsvRowSchema.safeParse({
      firstName: "Kenji",
      lastName: "Sato",
      status: "active",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("ACTIVE");
    }
  });

  it("keeps only valid emails", () => {
    const good = studentCsvRowSchema.safeParse({
      firstName: "A",
      lastName: "B",
      email: "a@example.test",
    });
    expect(good.success).toBe(true);

    const bad = studentCsvRowSchema.safeParse({
      firstName: "A",
      lastName: "B",
      email: "not-an-email",
    });
    expect(bad.success).toBe(true);
    if (bad.success) {
      expect(bad.data.email).toBe("");
    }
  });

  it("covers every status label", () => {
    expect(STUDENT_STATUSES).toHaveLength(4);
  });
});

describe("locationSchema", () => {
  it("requires a name", () => {
    const result = locationSchema.safeParse({
      name: "  ",
      email: "",
      sortOrder: "0",
    });
    expect(result.success).toBe(false);
  });

  it("normalises empty contact fields to null", () => {
    const result = locationSchema.safeParse({
      name: "Main Dojo",
      address: "",
      phone: "",
      email: "",
      sortOrder: "3",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address).toBeNull();
      expect(result.data.email).toBeNull();
      expect(result.data.sortOrder).toBe(3);
      expect(result.data.isActive).toBe(true);
    }
  });
});

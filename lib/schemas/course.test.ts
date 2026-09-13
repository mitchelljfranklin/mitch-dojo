import { describe, expect, it } from "vitest";

import {
  courseFormSchema,
  trainingTimeSchema,
  WEEKDAY_LABELS,
} from "@/lib/schemas/course";
import { trainerSchema } from "@/lib/schemas/trainer";
import { locationSchema } from "@/lib/schemas/location";

describe("trainingTimeSchema", () => {
  it("accepts valid 24-hour times", () => {
    const result = trainingTimeSchema.safeParse({
      weekday: "1",
      startTime: "18:00",
      endTime: "19:30",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weekday).toBe(1);
    }
  });

  it("rejects malformed times", () => {
    const result = trainingTimeSchema.safeParse({
      weekday: 1,
      startTime: "6:00pm",
      endTime: "19:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range weekdays", () => {
    const result = trainingTimeSchema.safeParse({
      weekday: 7,
      startTime: "18:00",
      endTime: "19:00",
    });
    expect(result.success).toBe(false);
  });
});

describe("courseFormSchema", () => {
  const base = {
    name: "Kids Karate",
    description: "",
    locationId: "loc-1",
    disciplineId: "disc-1",
    trainerId: "",
    isActive: true,
  };

  it("requires a location", () => {
    const result = courseFormSchema.safeParse({
      ...base,
      locationId: "",
      trainingTimes: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects slots where end is not after start", () => {
    const result = courseFormSchema.safeParse({
      ...base,
      trainingTimes: [{ weekday: 2, startTime: "19:00", endTime: "18:00" }],
    });
    expect(result.success).toBe(false);
  });

  it("normalises empty trainer to null", () => {
    const result = courseFormSchema.safeParse({
      ...base,
      trainerId: "",
      disciplineId: "disc-1",
      trainingTimes: [{ weekday: 3, startTime: "17:30", endTime: "18:30" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trainerId).toBeNull();
      expect(result.data.description).toBeNull();
      expect(result.data.trainingTimes[0]?.weekday).toBe(3);
    }
  });

  it("covers all weekday labels", () => {
    expect(Object.keys(WEEKDAY_LABELS)).toHaveLength(7);
  });
});

describe("trainerSchema", () => {
  it("normalises empty optional fields to null", () => {
    const result = trainerSchema.safeParse({
      name: " Sensei Kenji ",
      email: "",
      phone: "",
      bio: "",
      isActive: true,
      userId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Sensei Kenji");
      expect(result.data.email).toBeNull();
      expect(result.data.userId).toBeNull();
    }
  });

  it("rejects invalid emails", () => {
    const result = trainerSchema.safeParse({
      name: "Kenji",
      email: "not-an-email",
      isActive: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("locationSchema", () => {
  it("requires a name", () => {
    const result = locationSchema.safeParse({ name: "  ", sortOrder: "0" });
    expect(result.success).toBe(false);
  });
});

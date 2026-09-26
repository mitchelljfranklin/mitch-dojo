import { describe, expect, it } from "vitest";

import { pastAttendanceSchema } from "@/lib/schemas/attendance";

describe("pastAttendanceSchema", () => {
  it("accepts a valid calendar date", () => {
    const result = pastAttendanceSchema.safeParse({
      courseId: "course-1",
      date: "2026-02-28",
      status: "PRESENT",
    });
    expect(result.success).toBe(true);
  });

  it("rejects rollovers like 2026-02-31 that Date would normalise", () => {
    const result = pastAttendanceSchema.safeParse({
      courseId: "course-1",
      date: "2026-02-31",
      status: "PRESENT",
    });
    expect(result.success).toBe(false);
  });
});

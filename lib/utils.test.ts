import { describe, expect, it } from "vitest";

import { formatClassTime, formatDateUtc } from "./utils";

describe("formatClassTime", () => {
  it("renders the calendar day and start time without a course name", () => {
    expect(formatClassTime("2026-10-12", "18:00")).toBe("12 Oct 2026 at 18:00");
  });

  it("renders just the day when no time is given", () => {
    expect(formatClassTime("2026-10-12", null)).toBe("12 Oct 2026");
  });

  it("returns null without a date", () => {
    expect(formatClassTime(null, "18:00")).toBeNull();
    expect(formatClassTime("", null)).toBeNull();
  });
});

describe("formatDateUtc", () => {
  it("formats a UTC-midnight instant on the correct calendar day", () => {
    expect(formatDateUtc("2026-10-12T00:00:00.000Z")).toBe("12 Oct 2026");
  });
});

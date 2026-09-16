import { describe, expect, it } from "vitest";

import { appearanceSettingsSchema } from "./schema";

describe("appearanceSettingsSchema", () => {
  it("defaults the booking copy when unset", () => {
    const settings = appearanceSettingsSchema.parse({});
    expect(settings.bookingHeadline).toBe("Book a free trial class");
    expect(settings.bookingDescription).toBe(
      "Try a class — no experience needed, all ages welcome.",
    );
  });

  it("keeps provided booking copy", () => {
    const settings = appearanceSettingsSchema.parse({
      bookingHeadline: "Start your journey with us",
      bookingDescription: "Free trial, every Saturday.",
    });
    expect(settings.bookingHeadline).toBe("Start your journey with us");
    expect(settings.bookingDescription).toBe("Free trial, every Saturday.");
  });

  it("keeps over-long values for the server action to clamp", () => {
    // The schema reports the violation; the save action clamps silently so
    // the stored value always satisfies the public page.
    const result = appearanceSettingsSchema.safeParse({
      bookingHeadline: "x".repeat(200),
    });
    expect(result.success).toBe(false);
  });
});

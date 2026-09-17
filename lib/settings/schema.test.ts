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

  it("defaults the dark logo to absent and email variant to primary", () => {
    const settings = appearanceSettingsSchema.parse({});
    expect(settings.logoDarkKey).toBe("");
    expect(settings.emailLogoVariant).toBe("primary");
  });

  it("normalises quote-wrapped logo keys", () => {
    const settings = appearanceSettingsSchema.parse({
      logoKey: '"logo-abc.png"',
      logoDarkKey: '"logo-dark-abc.png"',
    });
    expect(settings.logoKey).toBe("logo-abc.png");
    expect(settings.logoDarkKey).toBe("logo-dark-abc.png");
  });

  it("rejects unknown email logo variants", () => {
    const result = appearanceSettingsSchema.safeParse({
      emailLogoVariant: "rainbow",
    });
    expect(result.success).toBe(false);
  });

  it("accepts the dark email variant", () => {
    const settings = appearanceSettingsSchema.parse({
      emailLogoVariant: "dark",
    });
    expect(settings.emailLogoVariant).toBe("dark");
  });
});

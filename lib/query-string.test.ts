import { describe, expect, it } from "vitest";

import { updateQueryString } from "./query-string";

describe("updateQueryString", () => {
  it("preserves unrelated parameters when setting a value", () => {
    expect(updateQueryString("status=PAID&location=abc", { q: "smith" })).toBe(
      "status=PAID&location=abc&q=smith",
    );
  });

  it("replaces an existing parameter", () => {
    expect(updateQueryString("status=OPEN&q=smith", { status: "PAID" })).toBe(
      "status=PAID&q=smith",
    );
  });

  it("removes a parameter when the value is empty or null", () => {
    expect(updateQueryString("q=smith&status=PAID", { q: "" })).toBe(
      "status=PAID",
    );
    expect(updateQueryString("q=smith&status=PAID", { q: null })).toBe(
      "status=PAID",
    );
  });

  it("leaves other parameters untouched when clearing one", () => {
    expect(
      updateQueryString("status=PAID&location=abc&q=smith", { location: null }),
    ).toBe("status=PAID&q=smith");
  });
});

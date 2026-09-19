import { describe, expect, it } from "vitest";

import { isLoopbackUrl } from "./env";

describe("isLoopbackUrl", () => {
  it("flags loopback hosts", () => {
    expect(isLoopbackUrl("http://localhost:3000")).toBe(true);
    expect(isLoopbackUrl("http://127.0.0.1:3000")).toBe(true);
    expect(isLoopbackUrl("http://[::1]:3000")).toBe(true);
    expect(isLoopbackUrl("http://app.localhost:3000")).toBe(true);
  });

  it("accepts public and LAN origins", () => {
    expect(isLoopbackUrl("https://dojo.example.com")).toBe(false);
    expect(isLoopbackUrl("http://192.168.1.20:3000")).toBe(false);
    expect(isLoopbackUrl("https://10.0.0.5")).toBe(false);
  });

  it("returns false for unparseable input", () => {
    expect(isLoopbackUrl("not a url")).toBe(false);
  });
});

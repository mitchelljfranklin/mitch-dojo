import { beforeAll, describe, expect, it } from "vitest";

// lib/client-ip imports lib/env, which validates the process environment at
// module load — provide the minimum it needs, then import dynamically.
let resolveClientIp: (typeof import("@/lib/client-ip"))["resolveClientIp"];

beforeAll(async () => {
  process.env.AUTH_SECRET ??= "test-auth-secret-0123456789abcdef";
  process.env.APP_ENCRYPTION_KEY ??= "test-encryption-key-0123456789abcdef";
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
  ({ resolveClientIp } = await import("@/lib/client-ip"));
});

function headersFrom(map: Record<string, string>) {
  const lower = new Map(
    Object.entries(map).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return { get: (name: string) => lower.get(name.toLowerCase()) ?? null };
}

describe("resolveClientIp", () => {
  it("prefers an operator-declared client IP header", () => {
    const ip = resolveClientIp(
      headersFrom({
        "cf-connecting-ip": "203.0.113.9",
        "x-real-ip": "10.0.0.1",
      }),
      { trustedProxyCount: 0, clientIpHeader: "cf-connecting-ip" },
    );
    expect(ip).toBe("203.0.113.9");
  });

  it("uses the client hop from X-Forwarded-For behind a trusted proxy", () => {
    const ip = resolveClientIp(
      headersFrom({ "x-forwarded-for": "203.0.113.9" }),
      { trustedProxyCount: 1 },
    );
    expect(ip).toBe("203.0.113.9");
  });

  it("falls back to X-Real-IP only when a trusted proxy is declared", () => {
    const ip = resolveClientIp(headersFrom({ "x-real-ip": "203.0.113.9" }), {
      trustedProxyCount: 1,
    });
    expect(ip).toBe("203.0.113.9");
  });

  it("ignores spoofable forwarding headers with no trusted proxy", () => {
    // The spoofing attack: rotate X-Real-IP to get fresh rate-limit buckets.
    const first = resolveClientIp(headersFrom({ "x-real-ip": "203.0.113.1" }), {
      trustedProxyCount: 0,
    });
    const second = resolveClientIp(
      headersFrom({
        "x-real-ip": "203.0.113.2",
        "x-forwarded-for": "203.0.113.2",
      }),
      { trustedProxyCount: 0 },
    );
    expect(first).toBe("unknown");
    expect(second).toBe("unknown");
  });
});

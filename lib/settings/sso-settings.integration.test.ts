import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  consumeBreakGlassHash,
  getBreakGlassHash,
  getSsoSecret,
  getSsoSettings,
  setBreakGlassHash,
  updateSsoSettings,
} from "@/lib/settings";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

const SSO_KEYS = [
  "sso.entraIdClientSecret",
  "sso.googleClientSecret",
  "sso.oidcClientSecret",
  "sso.breakGlassHash",
];

beforeAll(async () => {
  await prisma.appSetting.deleteMany({ where: { key: { in: SSO_KEYS } } });
  await prisma.appSetting.deleteMany({
    where: { key: { startsWith: "sso.", not: { in: SSO_KEYS } } },
  });
});

afterAll(async () => {
  await prisma.appSetting.deleteMany({ where: { key: { in: SSO_KEYS } } });
  await prisma.appSetting.deleteMany({
    where: { key: { startsWith: "sso.", not: { in: SSO_KEYS } } },
  });
});

describe.skipIf(!hasTestDatabase)("sso settings", () => {
  it("defaults to everything disabled with no stored rows", async () => {
    const view = await getSsoSettings();
    expect(view.entraIdEnabled).toBe(false);
    expect(view.googleEnabled).toBe(false);
    expect(view.oidcEnabled).toBe(false);
    expect(view.disableLocalAuth).toBe(false);
    expect(view.autoProvisionRoleId).toBe("");
    expect(view.entraIdSecretConfigured).toBe(false);
  });

  it("round-trips non-secret fields and never returns secrets in the view", async () => {
    await updateSsoSettings({
      entraIdEnabled: true,
      entraIdClientId: `client-${suffix}`,
      entraIdClientSecret: `secret-${suffix}`,
      allowedDomain: "Example.com",
    });

    const view = await getSsoSettings();
    expect(view.entraIdEnabled).toBe(true);
    expect(view.entraIdClientId).toBe(`client-${suffix}`);
    expect(view.allowedDomain).toBe("example.com");
    expect(view.entraIdSecretConfigured).toBe(true);

    const raw = JSON.stringify(view);
    expect(raw).not.toContain(`secret-${suffix}`);
  });

  it("decrypts the stored secret on demand", async () => {
    await expect(getSsoSecret("entraId")).resolves.toBe(`secret-${suffix}`);
  });

  it("keeps an existing secret when the update sends a blank one", async () => {
    await updateSsoSettings({ entraIdClientSecret: "" });
    await expect(getSsoSecret("entraId")).resolves.toBe(`secret-${suffix}`);
  });

  it("returns null for an undecryptable secret instead of throwing", async () => {
    await prisma.appSetting.update({
      where: { key: "sso.entraIdClientSecret" },
      data: { value: "not-valid-ciphertext" },
    });
    await expect(getSsoSecret("entraId")).resolves.toBeNull();
  });
});

describe.skipIf(!hasTestDatabase)("break-glass storage", () => {
  it("round-trips until consumed, then reads as absent", async () => {
    await setBreakGlassHash("$2a$12$hashplaceholder");

    const before = await getBreakGlassHash();
    expect(before).toBe("$2a$12$hashplaceholder");

    await consumeBreakGlassHash();
    await expect(getBreakGlassHash()).resolves.toBeNull();
  });

  it("reads an expired token as absent", async () => {
    await setBreakGlassHash("$2a$12$hashplaceholder2");
    await prisma.appSetting.update({
      where: { key: "sso.breakGlassHash" },
      data: {
        value: {
          hash: "$2a$12$hashplaceholder2",
          expiresAt: new Date(Date.now() - 1000).toISOString(),
          consumed: false,
        },
      },
    });
    await expect(getBreakGlassHash()).resolves.toBeNull();
  });

  it("revokes the previous token when a new one is generated", async () => {
    await setBreakGlassHash("$2a$12$old");
    await setBreakGlassHash("$2a$12$new");
    await expect(getBreakGlassHash()).resolves.toBe("$2a$12$new");
  });

  it("stores only the bcrypt hash — never the raw token", async () => {
    await setBreakGlassHash("$2a$12$hashed-token-representation");
    const row = await prisma.appSetting.findUnique({
      where: { key: "sso.breakGlassHash" },
    });
    const stored = JSON.stringify(row?.value ?? "");
    // The bcrypt hash is one-way; the plaintext token never touches the DB.
    expect(stored).toContain("$2a$12$hashed-token-representation");
    expect(await getBreakGlassHash()).toBe(
      "$2a$12$hashed-token-representation",
    );
  });
});

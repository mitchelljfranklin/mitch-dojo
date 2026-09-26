import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { resolveSsoUser } from "@/lib/db/sso";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

const emails: string[] = [];

async function makeUser(email: string, roleId: string): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email,
      name: `Sso ${suffix}`,
      passwordHash: "x".repeat(20),
      roleId,
    },
    select: { id: true },
  });
  emails.push(email);
  return user.id;
}

let roleId: string;

beforeAll(async () => {
  if (!hasTestDatabase) return;
  // The provisioning fallback looks up a role named "Viewer"; ensure one
  // exists (the test database is normally seeded with system roles).
  const role = await prisma.role.upsert({
    where: { name: "Viewer" },
    update: {},
    create: { name: "Viewer", permissions: [] },
  });
  roleId = role.id;
});

afterAll(async () => {
  if (!hasTestDatabase) return;
  if (emails.length > 0) {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("resolveSsoUser email verification", () => {
  it("refuses to link an unverified email to an existing account", async () => {
    const email = `sso-unverified-${suffix}@example.com`;
    const existingId = await makeUser(email, roleId);

    const result = await resolveSsoUser({
      provider: "google",
      providerId: `p-unverified-${suffix}`,
      email,
      name: "Impostor",
      emailVerified: false,
    });

    expect(result).toBeNull();
    // No identity was linked to the existing account.
    const links = await prisma.ssoIdentity.count({
      where: { userId: existingId },
    });
    expect(links).toBe(0);
  });

  it("links a verified email to the existing account", async () => {
    const email = `sso-verified-${suffix}@example.com`;
    const existingId = await makeUser(email, roleId);

    const result = await resolveSsoUser({
      provider: "google",
      providerId: `p-verified-${suffix}`,
      email,
      name: "Owner",
      emailVerified: true,
    });

    expect(result?.id).toBe(existingId);
    const links = await prisma.ssoIdentity.count({
      where: { userId: existingId },
    });
    expect(links).toBe(1);
  });

  it("refuses to provision an account from an unverified email", async () => {
    const email = `sso-provision-unverified-${suffix}@example.com`;

    const result = await resolveSsoUser({
      provider: "google",
      providerId: `p-prov-unverified-${suffix}`,
      email,
      name: "Newcomer",
      emailVerified: false,
    });

    expect(result).toBeNull();
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });
});

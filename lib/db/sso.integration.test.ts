import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { resolveSsoUser, toSsoProviderKey } from "@/lib/db/sso";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

const createdUserIds: string[] = [];
const createdRoleIds: string[] = [];

async function trackUser(id: string) {
  createdUserIds.push(id);
  return id;
}

async function makeRole(name: string): Promise<string> {
  const role = await prisma.role.create({
    data: {
      name: `${name} ${suffix}`,
      description: "SSO test role",
      permissions: ["students:view"],
    },
  });
  createdRoleIds.push(role.id);
  return role.id;
}

async function ssoSignIn(input: {
  provider: "entraId" | "google" | "oidc";
  providerId: string;
  email: string;
  name?: string;
}) {
  return resolveSsoUser({
    provider: input.provider,
    providerId: input.providerId,
    email: input.email,
    name: input.name ?? null,
  });
}

beforeAll(async () => {
  await prisma.ssoIdentity.deleteMany({
    where: { providerId: { startsWith: `sso-test-${suffix}` } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: `@sso-${suffix}.test` } },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } });
  await prisma.appSetting.deleteMany({
    where: { key: "sso.autoProvisionRoleId" },
  });
});

describe.skipIf(!hasTestDatabase)("toSsoProviderKey", () => {
  it("maps Auth.js provider ids to canonical keys", () => {
    expect(toSsoProviderKey("microsoft-entra-id")).toBe("entraId");
    expect(toSsoProviderKey("google")).toBe("google");
    expect(toSsoProviderKey("oidc")).toBe("oidc");
  });

  it("returns null for unknown providers", () => {
    expect(toSsoProviderKey("saml")).toBeNull();
  });
});

describe.skipIf(!hasTestDatabase)("resolveSsoUser", () => {
  it("rejects unknown providers", async () => {
    const user = await resolveSsoUser({
      provider: "facebook" as "entraId",
      providerId: `sso-test-${suffix}-x`,
      email: `x@sso-${suffix}.test`,
      name: null,
    });
    expect(user).toBeNull();
  });

  it("provisions a passwordless user on first sign-in and links the identity", async () => {
    const roleId = await makeRole("SSO Default");
    await prisma.appSetting.upsert({
      where: { key: "sso.autoProvisionRoleId" },
      update: { value: roleId, category: "sso" },
      create: {
        key: "sso.autoProvisionRoleId",
        category: "sso",
        value: roleId,
      },
    });

    const email = `provisioned@sso-${suffix}.test`;
    const user = await ssoSignIn({
      provider: "google",
      providerId: `sso-test-${suffix}-g1`,
      email,
      name: "Provisioned User",
    });
    expect(user).not.toBeNull();
    await trackUser(user!.id);
    expect(user!.email).toBe(email);
    expect(user!.passwordHash).toBe("");
    expect(user!.roleId).toBe(roleId);

    const identity = await prisma.ssoIdentity.findUnique({
      where: {
        provider_providerId: {
          provider: "google",
          providerId: `sso-test-${suffix}-g1`,
        },
      },
    });
    expect(identity?.userId).toBe(user!.id);
  });

  it("does not duplicate the identity on a second sign-in", async () => {
    const first = await ssoSignIn({
      provider: "entraId",
      providerId: `sso-test-${suffix}-m1`,
      email: `again@sso-${suffix}.test`,
      name: "Again User",
    });
    expect(first).not.toBeNull();
    await trackUser(first!.id);

    const second = await ssoSignIn({
      provider: "entraId",
      providerId: `sso-test-${suffix}-m1`,
      email: `again@sso-${suffix}.test`,
      name: "Again User",
    });
    expect(second?.id).toBe(first!.id);

    const identities = await prisma.ssoIdentity.findMany({
      where: { providerId: `sso-test-${suffix}-m1` },
    });
    expect(identities).toHaveLength(1);
  });

  it("links to an existing local account by email and keeps its password", async () => {
    const local = await prisma.user.create({
      data: {
        email: `local@sso-${suffix}.test`,
        name: "Local User",
        passwordHash: "preset-hash",
        roleId: (await makeRole("SSO Local Role")) as string,
      },
    });
    await trackUser(local.id);

    const linked = await ssoSignIn({
      provider: "google",
      providerId: `sso-test-${suffix}-g2`,
      email: local.email,
      name: "Local User",
    });
    expect(linked?.id).toBe(local.id);
    expect(linked?.passwordHash).toBe("preset-hash");
  });

  it("denies a disabled user with an existing identity", async () => {
    const disabled = await prisma.user.create({
      data: {
        email: `disabled@sso-${suffix}.test`,
        name: "Disabled User",
        passwordHash: "",
        roleId: (await makeRole("SSO Disabled Role")) as string,
        disabled: true,
      },
    });
    await trackUser(disabled.id);
    await prisma.ssoIdentity.create({
      data: {
        userId: disabled.id,
        provider: "oidc",
        providerId: `sso-test-${suffix}-o1`,
      },
    });

    const result = await ssoSignIn({
      provider: "oidc",
      providerId: `sso-test-${suffix}-o1`,
      email: disabled.email,
      name: "Disabled User",
    });
    expect(result).toBeNull();
  });

  it("denies sign-in when no email is provided", async () => {
    const result = await resolveSsoUser({
      provider: "google",
      providerId: `sso-test-${suffix}-g3`,
      email: null,
      name: null,
    });
    expect(result).toBeNull();
  });

  it("falls back to the Viewer role when the configured role was deleted", async () => {
    await prisma.appSetting.upsert({
      where: { key: "sso.autoProvisionRoleId" },
      update: { value: "nonexistent-role-id", category: "sso" },
      create: {
        key: "sso.autoProvisionRoleId",
        category: "sso",
        value: "nonexistent-role-id",
      },
    });

    const user = await ssoSignIn({
      provider: "google",
      providerId: `sso-test-${suffix}-g4`,
      email: `fallback@sso-${suffix}.test`,
      name: "Fallback User",
    });
    expect(user).not.toBeNull();
    await trackUser(user!.id);
    const viewerRole = await prisma.role.findFirst({
      where: { name: "Viewer" },
    });
    expect(user!.roleId).toBe(viewerRole?.id ?? null);
  });
});

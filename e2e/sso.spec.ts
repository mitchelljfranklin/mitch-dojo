import { expect, test } from "@playwright/test";

import { hashBreakGlassToken } from "@/lib/break-glass";
import { prisma } from "@/lib/prisma";

const SSO_KEYS = [
  "sso.entraIdEnabled",
  "sso.entraIdClientId",
  "sso.entraIdClientSecret",
  "sso.googleEnabled",
  "sso.googleClientId",
  "sso.googleClientSecret",
  "sso.oidcEnabled",
  "sso.oidcName",
  "sso.oidcIssuer",
  "sso.oidcClientId",
  "sso.oidcClientSecret",
  "sso.autoProvisionRoleId",
  "sso.allowedDomain",
  "sso.disableLocalAuth",
  "sso.breakGlassHash",
];

async function seedSsoSetting(key: string, value: string | boolean) {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value, category: "sso" },
    create: { key, category: "sso", value },
  });
}

// Seeds a fully configured Google provider (enable + client id + encrypted
// secret) the way the SSO form would, then whatever else the test asks for.
async function seedGoogleSso() {
  const { encryptSecret } = await import("@/lib/crypto");
  await seedSsoSetting("sso.googleEnabled", true);
  await seedSsoSetting("sso.googleClientId", "e2e-google-client-id");
  await seedSsoSetting(
    "sso.googleClientSecret",
    encryptSecret("e2e-google-client-secret"),
  );
}

test.describe("sso login page", () => {
  test.afterAll(async () => {
    await prisma.appSetting.deleteMany({ where: { key: { in: SSO_KEYS } } });
    await prisma.$disconnect();
  });

  test("shows SSO buttons alongside the local form by default", async ({
    page,
  }) => {
    await seedGoogleSso();

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "My Dojo" })).toBeVisible();
    const ssoButton = page.getByRole("button", { name: "Sign in with Google" });
    await expect(ssoButton).toBeVisible();
    // Local form still present while local auth is not disabled
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("hides the local form in SSO-only mode", async ({ page }) => {
    await seedGoogleSso();
    await seedSsoSetting("sso.disableLocalAuth", true);

    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: "Sign in with Google" }),
    ).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveCount(0);
    await expect(
      page.getByText("single sign-on only", { exact: false }),
    ).toBeVisible();
  });

  test("ignores disableLocalAuth while no provider is fully configured", async ({
    page,
  }) => {
    await seedSsoSetting("sso.disableLocalAuth", true);
    await prisma.appSetting.deleteMany({
      where: { key: "sso.googleClientSecret" },
    });

    await page.goto("/login");
    // No SSO button rendered (half-configured provider) and the anti-lock-out
    // rule keeps the local form visible.
    await expect(
      page.getByRole("button", { name: /Sign in with/ }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("a break-glass URL restores the local form once, then is consumed", async ({
    page,
  }) => {
    await seedGoogleSso();
    await seedSsoSetting("sso.disableLocalAuth", true);

    const { generateBreakGlassToken } = await import("@/lib/break-glass");
    const { setBreakGlassHash } = await import("@/lib/settings");
    const token = generateBreakGlassToken();
    // Store through the real accessor so the record shape (hash + expiry +
    // consumed flag) matches what the login page reads.
    await setBreakGlassHash(await hashBreakGlassToken(token));

    await page.goto(`/login?breakGlass=${token}`);
    await expect(page.getByLabel("Password")).toBeVisible();

    // Second visit without a token: SSO-only again (single-use consumed).
    await page.goto("/login");
    await expect(page.getByLabel("Password")).toHaveCount(0);
  });
});

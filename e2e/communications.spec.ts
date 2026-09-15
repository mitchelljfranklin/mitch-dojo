import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

test.describe("communication settings", () => {
  test("saves reminder toggles and templates", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/settings?tab=communications");
    await expect(
      page.getByText("Communication", { exact: true }).first(),
    ).toBeVisible();

    // Toggle birthday emails off and save
    await page
      .getByRole("checkbox", { name: /Enable birthday emails/ })
      .uncheck();
    await page
      .getByRole("button", { name: "Save communication settings" })
      .click();
    await expect(
      page.getByText("Communication settings saved.").first(),
    ).toBeVisible();

    // Toggle it back on so other runs start from the default
    await page
      .getByRole("checkbox", { name: /Enable birthday emails/ })
      .check();
    await page
      .getByRole("button", { name: "Save communication settings" })
      .click();
    await expect(
      page.getByText("Communication settings saved.").first(),
    ).toBeVisible();
  });

  test("reports a failed sample send without SMTP", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard", { timeout: 15_000 });

    await page.goto("/settings?tab=communications");
    await page.getByLabel("Recipient").fill("sample@example.com");
    await page.getByRole("button", { name: "Send sample" }).click();
    // The test database has no SMTP configured, so the send must fail
    // gracefully with guidance rather than throwing.
    await expect(page.getByText(/Send failed/).first()).toBeVisible();
  });
});

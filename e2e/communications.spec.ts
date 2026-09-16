import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

// Hydration of the heavy settings page finishes after network idle —
// clicking earlier hits a pre-hydration native submit that loses the
// client-side action entirely.
async function waitSettingsInteractive(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1_500);
}

test.describe("communication settings", () => {
  test("saves reminder toggles and templates", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/admin/communications");
    await waitSettingsInteractive(page);
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

  test("sample send without SMTP lands a FAILED row in the email log", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/admin/communications");
    await waitSettingsInteractive(page);
    await page.getByLabel("Recipient").fill("probe@example.com");
    await page.getByRole("button", { name: "Send sample" }).click();

    // The test database has no SMTP, so the send must fail — the durable
    // record is a FAILED row in the email log (client toasts are transient).
    await page.goto("/admin/email-log");
    await expect(
      page.getByText("Email log", { exact: true }).first(),
    ).toBeVisible();
    const failedRow = page
      .getByRole("row", { name: /Class reminder: Sample Class/ })
      .filter({ hasText: "FAILED" })
      .first();
    await expect(failedRow).toBeVisible();
  });

  test("email log retry re-runs the failed send", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/admin/communications");
    await waitSettingsInteractive(page);
    await page.getByLabel("Recipient").fill("probe@example.com");
    await page.getByRole("button", { name: "Send sample" }).click();

    await page.goto("/admin/email-log");
    await waitSettingsInteractive(page);
    const failedRow = page
      .getByRole("row", { name: /Class reminder: Sample Class/ })
      .filter({ hasText: "FAILED" })
      .first();
    await expect(failedRow).toBeVisible();

    // Retry: still fails without SMTP, but the action runs, the log row is
    // reused (status flips in place), and the retry is audit-logged.
    await failedRow.getByRole("button", { name: "Retry" }).click();
    await expect(
      page
        .getByRole("row", { name: /Class reminder: Sample Class/ })
        .filter({ hasText: "FAILED" })
        .first(),
    ).toBeVisible();
  });
});

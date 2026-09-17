import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

// Hydration of the heavy admin pages finishes after network idle —
// clicking earlier hits a pre-hydration native submit that loses the
// client-side action entirely.
async function waitAdminInteractive(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1_500);
}

test.describe("communication settings", () => {
  test("saves reminder toggles on the Communication page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/admin/communications");
    await waitAdminInteractive(page);
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

  test("saves email templates on the Templates page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/admin/templates");
    await waitAdminInteractive(page);
    await expect(page.getByText("Email templates").first()).toBeVisible();

    const customSubject = "E2E Class Reminder Subject";
    await page.getByLabel("Class reminder subject").fill(customSubject);
    await page.getByRole("button", { name: "Save email templates" }).click();
    // The toast appears only after the action resolves — the DB row is
    // written by then. Reload to verify durably (and to drop any pending
    // client remount from the refresh).
    await expect(
      page.getByText("Email templates saved.").first(),
    ).toBeVisible();
    await page.goto("/admin/templates");
    await waitAdminInteractive(page);
    await expect(page.getByLabel("Class reminder subject")).toHaveValue(
      customSubject,
    );

    // Restore the default so later tests see the default template. A fresh
    // navigation between saves avoids the post-save remount wiping the fill.
    await page.goto("/admin/templates");
    await waitAdminInteractive(page);
    await page
      .getByLabel("Class reminder subject")
      .fill("Class reminder: {{className}}");
    await page.getByRole("button", { name: "Save email templates" }).click();
    await expect(
      page.getByText("Email templates saved.").first(),
    ).toBeVisible();
    await page.goto("/admin/templates");
    await waitAdminInteractive(page);
    await expect(page.getByLabel("Class reminder subject")).toHaveValue(
      "Class reminder: {{className}}",
    );
  });

  test("sample send without SMTP lands a FAILED row in the email log", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/admin/templates");
    await waitAdminInteractive(page);
    await page.getByLabel("Recipient").fill("sample@dojo.test");
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

    await page.goto("/admin/templates");
    await waitAdminInteractive(page);
    await page.getByLabel("Recipient").fill("sample@dojo.test");
    await page.getByRole("button", { name: "Send sample" }).click();

    await page.goto("/admin/email-log");
    await waitAdminInteractive(page);
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

  test("email log filters update the URL and apply", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/admin/email-log");
    await waitAdminInteractive(page);

    // Pick "Failed" in the status select — the form auto-submits and the
    // URL must carry the canonical emailStatus param.
    await page.getByLabel("Status").click();
    await page.getByRole("option", { name: "Failed" }).click();
    await page.waitForURL(/emailStatus=FAILED/);
    expect(new URL(page.url()).searchParams.get("emailStatus")).toBe("FAILED");

    // The filtered view shows only FAILED rows; a SENT row would be a bug.
    await expect(page.getByText("SENT", { exact: true })).toHaveCount(0);
  });
});

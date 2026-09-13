import { expect, test } from "@playwright/test";

import { E2E_VIEWER_EMAIL, E2E_VIEWER_PASSWORD } from "./global-setup";

// RBAC: gated controls are hidden (not greyed out) for low-privilege roles.
test.describe("rbac viewer", () => {
  test("viewer has no manage controls", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_VIEWER_EMAIL);
    await page.getByLabel("Password").fill(E2E_VIEWER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Students" })).toBeVisible();

    // Direct navigation to settings bounces back to the dashboard.
    await page.goto("/settings");
    await page.waitForURL("**/dashboard");
  });
});

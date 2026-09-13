import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

test.describe("authentication", () => {
  test("signs in, reaches the dashboard, and signs out", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/dashboard");
    await expect(page.getByText("Welcome, E2E Admin")).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();

    // Sidebar → settings reachable for admins
    await page.getByRole("link", { name: "Settings" }).click();
    await page.waitForURL("**/settings**");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Sign out via the user menu
    await page
      .getByRole("button", { name: /E2E Admin/i })
      .first()
      .click();
    await page.getByRole("menuitem", { name: /sign out|log out/i }).click();
    await page.waitForURL("**/login**");
  });

  test("rejects wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });
});

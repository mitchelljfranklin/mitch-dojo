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

    // Admin nav button in the header + sidebar Settings entry
    await expect(
      page.getByRole("link", { name: "Admin" }).first(),
    ).toBeVisible();

    // Navigate to the admin area; the settings page runs many queries
    // (including the audit log) so allow a slower first render.
    await page.goto("/admin/general");
    await expect(page.getByRole("heading", { name: "General" })).toBeVisible({
      timeout: 10_000,
    });

    // The General page carries the Organization and Appearance cards
    // (regression guard: these were once silently dropped).
    await expect(page.getByText("Organization", { exact: true })).toBeVisible();
    await expect(page.getByText("Appearance", { exact: true })).toBeVisible();

    // Admin sidebar shows the section groups (regression guard: the Users
    // and Roles section links were once lost in an edit).
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Roles" })).toBeVisible();

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

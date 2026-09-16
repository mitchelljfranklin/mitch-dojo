import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

test.describe("white-label", () => {
  test("booking page renders org name and a custom headline", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    // Set a custom booking headline under Settings → General (appearance)
    await page.goto("/settings?tab=general");
    await page
      .getByLabel("Booking page headline")
      .fill("E2E Custom Trial Headline");
    await page.getByRole("button", { name: "Save appearance" }).click();
    await expect(page.getByText("Appearance settings saved.")).toBeVisible();

    // The public booking page shows the org name and the custom headline
    await page.goto("/book");
    await expect(page.getByText("My Dojo", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "E2E Custom Trial Headline" }),
    ).toBeVisible();

    // Restore the default headline so other runs start clean
    await page.goto("/settings?tab=general");
    await page
      .getByLabel("Booking page headline")
      .fill("Book a free trial class");
    await page.getByRole("button", { name: "Save appearance" }).click();
    await expect(page.getByText("Appearance settings saved.")).toBeVisible();
  });
});

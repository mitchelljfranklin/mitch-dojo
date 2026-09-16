import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

// 1x1 transparent PNG — enough for the upload allowlist (extension +
// magic bytes) and the <img> render assertions.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("white-label", () => {
  test("booking page renders org name, custom headline, and the logo", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    // Set a custom booking headline + upload a logo under Settings → General
    await page.goto("/settings?tab=general");
    await page
      .getByLabel("Booking page headline")
      .fill("E2E Custom Trial Headline");
    await page.getByLabel("Logo", { exact: true }).setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    await page.getByRole("button", { name: "Save appearance" }).click();
    await expect(page.getByText("Appearance settings saved.")).toBeVisible();

    // The public booking page: org eyebrow, custom headline, and the logo
    await page.goto("/book");
    await expect(page.getByText("My Dojo", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "E2E Custom Trial Headline" }),
    ).toBeVisible();
    await expect(page.locator('img[src*="/api/brand/logo"]')).toBeVisible();

    // Cleanup: remove the logo and restore the default headline
    await page.goto("/settings?tab=general");
    await page
      .getByLabel("Booking page headline")
      .fill("Book a free trial class");
    await page.getByRole("button", { name: "Remove logo" }).click();
    // ConfirmDialog renders a Radix AlertDialog (role=alertdialog).
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await page.getByRole("button", { name: "Save appearance" }).click();
    await expect(page.getByText("Appearance settings saved.")).toBeVisible();
  });
});

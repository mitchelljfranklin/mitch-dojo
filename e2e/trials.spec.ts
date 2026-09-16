import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

test.describe("trials", () => {
  test("public booking creates a trial lead in the pipeline and converts", async ({
    page,
  }) => {
    // --- public booking (no login) ---
    await page.goto("/book");
    await expect(
      page.getByRole("heading", { name: "Book a free trial class" }),
    ).toBeVisible();
    // White-label: the org name brands the page (eyebrow above the headline).
    await expect(page.getByText("My Dojo", { exact: true })).toBeVisible();

    await page.getByLabel("First name").fill("Web");
    await page.getByLabel("Last name").fill("Booker");
    // Native email validation rejects placeholder values — use a real shape.
    await page.getByLabel("Email").fill(`web-booker-${Date.now()}@example.com`);
    await page.getByRole("combobox", { name: "Location" }).click();
    await page.getByRole("option", { name: "E2E Dojo", exact: true }).click();
    await page.getByRole("combobox", { name: "Martial art" }).click();
    await page.getByRole("option", { name: "E2E Karate" }).click();
    await page.getByRole("button", { name: "Book my free trial" }).click();

    await expect(page.getByText("Booking received!")).toBeVisible();

    // --- staff pipeline ---
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/trials");
    await expect(page.getByRole("heading", { name: "Trials" })).toBeVisible();
    await expect(page.getByText("Web Booker").first()).toBeVisible();

    // Move the lead: NEW → CONTACTED → FIRST_CLASS → CONVERTED, waiting for
    // each revalidation so the next transition can't race a re-rendered form.
    const row = page.getByRole("row", { name: /Web Booker/ });
    await row.getByRole("combobox").selectOption("CONTACTED");
    await row.getByRole("button", { name: "Apply" }).click();
    await expect(row.getByText("Contacted", { exact: true })).toBeVisible();

    await row.getByRole("combobox").selectOption("FIRST_CLASS");
    await row.getByRole("button", { name: "Apply" }).click();
    await expect(row.getByText("First class", { exact: true })).toBeVisible();

    await row.getByRole("combobox").selectOption("CONVERTED");
    await row.getByRole("button", { name: "Apply" }).click();
    // Converted leads leave the pipeline (they are members now) — the row
    // disappears from the default view.
    await expect(page.getByRole("row", { name: /Web Booker/ })).toHaveCount(0);

    // ...and shows under the Converted filter and on their record.
    await page.goto("/trials?stage=CONVERTED");
    await expect(page.getByText("Web Booker").first()).toBeVisible();
    await page.goto("/students");
    await page.getByText("Web Booker").first().click();
    await page.waitForURL("**/students/*");
    await expect(page.getByText("Active", { exact: true })).toBeVisible();
  });

  test("booking form rejects missing contact details", async ({ page }) => {
    await page.goto("/book?error=contact");
    await expect(page.getByText("Something went wrong")).toBeVisible();
  });
});

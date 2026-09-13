import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

test.describe("belts", () => {
  test("adds belt levels and records a promotion for the attendance kid", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/belts");
    await page.getByText("E2E Attend Course").first().click();
    await page.waitForURL("**/belts/*");

    // Define the grading ladder
    await page.getByRole("button", { name: "Add belt", exact: true }).click();
    await page.getByLabel("Name", { exact: true }).fill("White");
    await page.getByLabel("Order (0 = entry rank)").fill("0");
    await page
      .getByRole("button", { name: "Add belt level", exact: true })
      .click();
    await expect(page.getByText("Belt level added.")).toBeVisible();

    await page.getByRole("button", { name: "Add belt", exact: true }).click();
    await page.getByLabel("Name", { exact: true }).fill("Yellow");
    await page.getByLabel("Order (0 = entry rank)").fill("1");
    await page.getByLabel("Required trainings").fill("1");
    await page
      .getByRole("button", { name: "Add belt level", exact: true })
      .click();
    await expect(page.getByText("Belt level added.")).toBeVisible();

    // Promote the attendance kid to White
    await page.getByRole("button", { name: "Promote" }).first().click();
    await page.getByLabel("Belt").selectOption({ label: "White" });
    await page.getByRole("button", { name: "Record promotion" }).click();
    await expect(
      page.getByText("Promotion recorded.").first(),
    ).toBeVisible();

    await expect(
      page.getByText("White", { exact: true }).first(),
    ).toBeVisible();

    // History is visible on the student record
    await page.goto("/students");
    await page.getByText("E2E Attend Kid").first().click();
    await page.waitForURL("**/students/*");
    await expect(page.getByText("Belt progression")).toBeVisible();
  });
});

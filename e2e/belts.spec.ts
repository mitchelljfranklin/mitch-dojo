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
    await expect(
      page.getByText("White", { exact: true }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Add belt", exact: true }).click();
    await page.getByLabel("Name", { exact: true }).fill("Yellow");
    await page.getByLabel("Order (0 = entry rank)").fill("1");
    // Deliberately unreachable so the override path is always exercised —
    // the kid may legitimately have trainings from the QR check-in specs.
    await page.getByLabel("Required trainings").fill("99");
    await page
      .getByRole("button", { name: "Add belt level", exact: true })
      .click();
    await expect(
      page.getByText("Yellow", { exact: true }).first(),
    ).toBeVisible();

    // Promote the attendance kid to White (entry rank — always eligible).
    // The sheet defaults to the next belt in the ladder, which for an
    // unranked student is the entry belt.
    await page.getByRole("button", { name: "Promote" }).first().click();
    await page.getByRole("button", { name: "Record promotion" }).click();
    await expect(page.getByText("Promotion recorded.").first()).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click({ force: true });

    // Wait for the post-promotion refresh so the next sheet's default belt
    // is computed from the kid's NEW rank (White → next: Yellow). The
    // cumulative count varies with the QR check-in specs, so match loosely.
    await expect(page.getByText(/trainings? on this course/)).toBeVisible();

    // Kid has at most a couple of trainings since the award — Yellow needs
    // 99, so the promotion is blocked until the instructor ticks Override.
    await page.getByRole("button", { name: "Promote" }).first().click();
    await page.getByRole("button", { name: "Record promotion" }).click();
    await expect(page.getByText(/requires 99 trainings/).first()).toBeVisible();

    await page.getByLabel("Override eligibility requirement").click();
    await page.getByRole("button", { name: "Record promotion" }).click();
    await expect(page.getByText("Promotion recorded.").first()).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click({ force: true });

    await expect(
      page.getByText("Yellow", { exact: true }).first(),
    ).toBeVisible();

    // History is visible on the student record
    await page.goto("/students");
    await page.getByText("E2E Attend Kid").first().click();
    await page.waitForURL("**/students/*");
    await expect(page.getByText("Belt progression")).toBeVisible();
    await expect(page.getByText("Yellow").first()).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

const E2E_PLAN_NAME = "E2E Monthly Membership";

test.describe("memberships", () => {
  test("creates a plan, enrolls a student, bills, and records a payment", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    // --- create a recurring plan ---
    await page.goto("/memberships");
    await page.getByRole("button", { name: "New plan" }).click();
    await page.getByLabel("Name").fill(E2E_PLAN_NAME);
    await page.getByLabel("Billing period").click();
    await page.getByRole("option", { name: "Monthly" }).click();
    await page.getByLabel(/Price/).fill("50.00");
    await page.getByRole("button", { name: "Create plan" }).click();
    await expect(page.getByText("Plan created.").first()).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click({ force: true });

    await expect(page.getByText(E2E_PLAN_NAME).first()).toBeVisible();

    // Enroll the e2e student from their record
    await page.goto("/students");
    await page.getByText("E2E Attend Kid").first().click();
    await page.waitForURL("**/students/*");
    await expect(page.getByText("Memberships").first()).toBeVisible();

    await page.getByRole("button", { name: "Enroll in plan" }).click();
    await page.getByRole("combobox", { name: "Plan" }).click();
    await page.getByRole("option", { name: E2E_PLAN_NAME }).click();
    await page.getByRole("button", { name: "Enroll", exact: true }).click();
    await expect(page.getByText("Member enrolled.").first()).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click({ force: true });
    await expect(page.getByText("Since", { exact: false })).toBeVisible();

    // Bill the plan manually, tagged to the E2E Dojo location
    await page.goto("/memberships/invoices");
    await page.getByRole("button", { name: "New invoice" }).click();
    await page.getByRole("combobox", { name: "Student" }).click();
    await page.getByRole("option", { name: "E2E Attend Kid" }).click();
    await page.getByRole("combobox", { name: "Plan" }).click();
    await page.getByRole("option", { name: E2E_PLAN_NAME }).click();
    await page.getByRole("combobox", { name: "Location" }).click();
    await page.getByRole("option", { name: "E2E Dojo", exact: true }).click();
    await page.getByRole("button", { name: "Create invoice" }).click();
    await expect(
      page.getByText(/Invoice #\d+ created\./).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click({ force: true });

    // Open the newest invoice via its number link and record the full payment
    await page.getByRole("link", { name: /#\d+/ }).first().click();
    await expect(page.getByText("Billed to")).toBeVisible();
    await expect(page.getByText("Location: E2E Dojo")).toBeVisible();

    await page.getByRole("button", { name: "Record payment" }).click();
    // The sheet's submit shares its name with the page-level button — scope
    // to the dialog so the click cannot race the sheet's mount.
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Record payment" })
      .click();
    await expect(page.getByText("Payment recorded.").first()).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click({ force: true });

    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Payments", { exact: true })).toBeVisible();

    // The plan list shows one active member
    await page.goto("/memberships");
    await expect(page.getByText("1", { exact: true })).toBeVisible();
  });
});

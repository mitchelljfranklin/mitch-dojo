import { expect, test } from "@playwright/test";

import { E2E_TRAINER_EMAIL, E2E_TRAINER_PASSWORD } from "./global-setup";

// RBAC: the Trainer experience audit (phasereview Batch 5). Walks the seeded
// Trainer role through every screen: floor-operations controls are present,
// administration is absent (hidden, never greyed), and direct admin
// navigation bounces.
test.describe("rbac trainer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_TRAINER_EMAIL);
    await page.getByLabel("Password").fill(E2E_TRAINER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");
  });

  test("floor operations are present", async ({ page }) => {
    // Students: view + create + edit. The record's student-delete form is
    // gated by students:delete (which Trainer lacks) — the belt-history
    // delete (belts:edit, which Trainer has) only exists once belts exist.
    await page.goto("/students");
    await expect(page.getByText("E2E Attend Kid").first()).toBeVisible();
    await page.getByText("E2E Attend Kid").first().click();
    await page.waitForURL("**/students/*");
    await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();
    await expect(page.locator('form[id^="delete-student-"]')).toHaveCount(0);

    // Schedule + classes: timetable and course list are reachable
    // (classes:view; editing courses is classes:edit, which Trainer lacks)
    await page.goto("/classes/schedule");
    await expect(
      page.getByRole("heading", { name: /Schedule/i }),
    ).toBeVisible();
    await page.goto("/classes");
    await expect(page.getByRole("heading", { name: "Classes" })).toBeVisible();

    // Belts: progression pages reachable
    await page.goto("/belts");
    await expect(page.getByRole("heading", { name: /Belts/i })).toBeVisible();

    // Analytics: visible
    await page.goto("/analytics");
    await expect(
      page.getByRole("heading", { name: /Analytics|Dashboard/i }),
    ).toBeVisible();
  });

  test("administration is hidden, not greyed", async ({ page }) => {
    // No admin gear in the header (no admin-area permissions at all)
    await expect(page.getByRole("button", { name: "Admin" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);

    // Direct navigation bounces
    await page.goto("/admin");
    await page.waitForURL("**/dashboard");
    await page.goto("/admin/users");
    await page.waitForURL("**/dashboard");

    // No "New plan" on memberships (read-only view only)
    await page.goto("/memberships");
    await expect(page.getByRole("button", { name: "New plan" })).toHaveCount(0);
  });

  test("bulk bar shows student actions but not enrollment", async ({
    page,
  }) => {
    await page.goto("/students");
    await page
      .getByRole("checkbox", { name: "Select E2E Attend Kid" })
      .setChecked(true);
    await expect(page.getByText("1 selected")).toBeVisible();

    // Trainer has students:edit → status + discipline controls; no
    // memberships:edit → no enroll control
    await expect(page.getByLabel("Status to apply")).toBeVisible();
    await expect(page.getByLabel("Plan to enroll")).toHaveCount(0);
  });
});

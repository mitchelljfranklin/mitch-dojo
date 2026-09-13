import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

test.describe("classes", () => {
  test("creates a trainer, course with weekly slots, and shows the schedule", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    // Create a trainer via the sheet manager
    await page.goto("/trainers");
    await page.getByRole("button", { name: "New trainer" }).click();
    await page.getByLabel("Name").fill("E2E Sensei");
    await page.getByRole("button", { name: "Create trainer" }).click();
    await expect(page.getByText("E2E Sensei").first()).toBeVisible();

    // Create a course with one weekly slot at the seeded Main Dojo
    await page.goto("/classes/new");
    await page.getByLabel("Name").fill("E2E Course");
    await page.getByLabel("Location").click();
    await page.getByRole("option", { name: "Main Dojo" }).click();
    await page.getByLabel("Slot 1 start time").fill("18:00");
    await page.getByLabel("Slot 1 end time").fill("19:00");
    await page.getByRole("button", { name: "Create course" }).click();

    await page.waitForURL("**/classes/*");
    await expect(
      page.getByRole("heading", { name: "E2E Course" }),
    ).toBeVisible();
    await expect(page.getByText("Weekly training times")).toBeVisible();
    await expect(page.getByText("Upcoming sessions")).toBeVisible();
    await expect(page.getByText("Main Dojo").first()).toBeVisible();

    // The weekly schedule shows the course on its weekday
    await page.goto("/classes/schedule");
    await expect(page.getByText("E2E Course").first()).toBeVisible();
  });

  test("course list filters by location", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/classes");
    await expect(page.getByText("E2E Course").first()).toBeVisible();
  });
});

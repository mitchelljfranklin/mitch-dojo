import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

test.describe("analytics", () => {
  test("renders the overview with stat cards, charts, and retention", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/analytics");
    await expect(
      page.getByRole("heading", { name: "Analytics" }),
    ).toBeVisible();

    // Overview stat cards
    await expect(page.getByText("Active members").first()).toBeVisible();
    await expect(
      page.getByText("Trials", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Active memberships").first()).toBeVisible();
    await expect(page.getByText("Revenue this month")).toBeVisible();

    // Charts and breakdowns
    await expect(page.getByText("Attendance — last 12 weeks")).toBeVisible();
    await expect(page.getByText("Revenue — last 6 months")).toBeVisible();
    await expect(page.getByText("Retention — at-risk members")).toBeVisible();
    await expect(page.getByText("Members per location")).toBeVisible();

    // The seeded E2E Dojo appears in the per-location table
    await expect(page.getByRole("cell", { name: "E2E Dojo" })).toBeVisible();
  });
});

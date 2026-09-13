import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

test.describe("attendance", () => {
  test("marks a student from the session attendance sheet", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/classes");
    await page.getByText("E2E Attend Course").first().click();
    await page.waitForURL("**/classes/*");

    await page.getByRole("link", { name: "Attendance" }).first().click();
    await page.waitForURL("**/sessions/*");

    await expect(page.getByText("E2E Attend Kid")).toBeVisible();

    const select = page.getByLabel("Attendance for E2E Attend Kid");
    await expect(select).toHaveValue("ABSENT");
    await select.selectOption("LATE");
    await page.getByRole("button", { name: "Save attendance" }).click();
    await expect(page.getByText("Attendance saved.")).toBeVisible();
    await expect(page.getByLabel("Attendance for E2E Attend Kid")).toHaveValue(
      "LATE",
    );
    // Leave the sheet ABSENT so the public check-in spec starts unchecked.
    await select.selectOption("ABSENT");
    await page.getByRole("button", { name: "Save attendance" }).click();
    await expect(page.getByText("Attendance saved.")).toBeVisible();
  });

  test("public check-in page lists today's class and taps a name", async ({
    page,
  }) => {
    const token = (await readFile("e2e/.checkin-token", "utf8")).trim();

    await page.goto(`/checkin/${token}`);

    await expect(page.getByText("Check in at E2E Dojo")).toBeVisible();
    await expect(page.getByText("E2E Attend Course")).toBeVisible();

    // The chip may already be checked-in (green, disabled) if a previous
    // step of this run checked the kid in — assert the outcome either way.
    const chip = page.getByRole("button", { name: "E2E Attend Kid" });
    await expect(chip).toBeVisible();
    if (await chip.isEnabled()) {
      await chip.click();
    }
    await expect(
      page.getByRole("button", { name: "✓ E2E Attend Kid" }),
    ).toBeVisible();
  });
});

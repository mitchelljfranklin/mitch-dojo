import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

test.describe("history import", () => {
  test("backfills past attendance from the student record", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/students");
    await page.getByText("E2E Attend Kid").first().click();
    await page.waitForURL("**/students/*");

    await page.getByRole("button", { name: "Add past attendance" }).click();
    await page
      .getByLabel("Course")
      .selectOption({ label: "E2E History Course (E2E Dojo)" });
    await page.getByLabel("Date attended").fill(isoDaysAgo(3));
    await page.getByRole("button", { name: "Save attendance" }).click();
    await expect(
      page.getByText("Past attendance added.").first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click({ force: true });

    await expect(page.getByText(/E2E History Course/).first()).toBeVisible();
  });

  test("imports attendance history from CSV", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    const csv = [
      "Date,Course,FirstName,LastName,Status",
      `${isoDaysAgo(10)},E2E History Course,E2E,Attend Kid,PRESENT`,
      `${isoDaysAgo(9)},E2E History Course,E2E,Attend Kid,LATE`,
      `${isoDaysAgo(8)},Unknown Course,E2E,Attend Kid,PRESENT`,
    ].join("\n");
    const csvPath = join(tmpdir(), "mitch-dojo-attendance-import.csv");
    await writeFile(csvPath, csv, "utf8");

    await page.goto("/attendance/import");
    await page.getByLabel("CSV file").setInputFiles(csvPath);
    await page.getByRole("button", { name: "Import" }).click();
    await expect(page.getByText(/Imported 2 trainings/).first()).toBeVisible();
  });

  test("imports belt history from CSV and shows it on the student record", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    const csv = [
      "FirstName,LastName,Belt,AwardedAt,Notes",
      `E2E,Attend Kid,Advanced,${isoDaysAgo(30)},Grading day`,
    ].join("\n");
    const csvPath = join(tmpdir(), "mitch-dojo-belt-import.csv");
    await writeFile(csvPath, csv, "utf8");

    await page.goto("/belts/import");
    await page
      .getByLabel("Course")
      .selectOption({ label: "E2E History Course (E2E Dojo)" });
    await page.getByLabel("CSV file").setInputFiles(csvPath);
    await page.getByRole("button", { name: "Import" }).click();
    await expect(page.getByText(/Imported 1 promotion/).first()).toBeVisible();

    await page.goto("/students");
    await page.getByText("E2E Attend Kid").first().click();
    await page.waitForURL("**/students/*");
    await expect(page.getByText("Belt progression")).toBeVisible();
    await expect(page.getByText("Advanced").first()).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

test.describe("students", () => {
  test("creates a location and a student, then finds them in the list", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    // Create a dedicated e2e location via Admin → Locations
    await page.getByRole("link", { name: "Admin" }).first().click();
    await page.waitForURL("**/admin**");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Locations" }).click();
    await page.waitForURL("**/admin/locations**");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "New location" }).click();
    await page.getByLabel("Name", { exact: true }).fill("E2E Dojo Two");
    await page.getByRole("button", { name: "Create location" }).click();
    await expect(page.getByText("Location created.")).toBeVisible();

    // Create a student assigned to the new location and the E2E Karate
    // discipline (disciplines are required, at least one)
    await page.goto("/students/new");
    await page.getByLabel("First name").fill("E2E");
    await page.getByLabel("Last name").fill("Student");
    await page.getByRole("checkbox", { name: "E2E Dojo Two" }).click();
    await page.getByRole("checkbox", { name: "E2E Karate" }).click();
    await page.getByLabel("Primary (home) dojo").selectOption({
      label: "E2E Dojo Two",
    });
    await page.getByRole("button", { name: "Create student" }).click();

    await page.waitForURL("**/students/*");
    await expect(
      page.getByRole("heading", { name: "E2E Student" }),
    ).toBeVisible();
    await expect(page.getByText("E2E Dojo Two (home)")).toBeVisible();

    // The list shows the new student with their home dojo
    await page.goto("/students");
    await expect(page.getByText("E2E Student").first()).toBeVisible();
  });

  test("filters students by status", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/students?status=ALUMNI");
    await expect(
      page.getByText("No students match the selected filters."),
    ).toBeVisible();
  });

  test("edit form saves and returns to the student record with the change", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    // The attendance kid trains E2E Karate only (global-setup). Add Jujitsu
    // and an address, save, and land back on the record.
    await page.goto("/students");
    await page.getByText("E2E Attend Kid").first().click();
    await page.waitForURL("**/students/*");
    await page.getByRole("link", { name: "Edit" }).click();
    await page.waitForURL("**/students/*/edit");

    await page.getByRole("checkbox", { name: "Jujitsu" }).check();
    await page.getByLabel("Street address").fill("12 Dojo Lane");
    await page.getByLabel("City", { exact: true }).fill("Testville");
    await page.getByLabel("State / Region / Province").fill("Test Region");
    await page.getByLabel("Postcode").fill("TE5 7ER");
    await page.getByLabel("Country").selectOption({ label: "Australia" });
    await page.getByRole("button", { name: "Save changes" }).click();

    // Successful save redirects straight to the display page.
    await page.waitForURL("**/students/*");
    await expect(page.getByText("Student updated.")).toBeVisible();
    await expect(page.getByText("Jujitsu", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "12 Dojo Lane, Testville, Test Region, TE5 7ER, Australia",
      ),
    ).toBeVisible();
  });
});

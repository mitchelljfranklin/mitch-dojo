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

    // Create a dedicated e2e location via Settings → Locations
    await page.getByRole("link", { name: "Settings" }).click();
    await page.waitForURL("**/settings**");
    await page.getByRole("tab", { name: "Locations" }).click();
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

  test("edit form shows the saved discipline change after save", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    // The attendance kid trains E2E Karate only (global-setup). Add Jujitsu.
    await page.goto("/students");
    await page.getByText("E2E Attend Kid").first().click();
    await page.waitForURL("**/students/*");
    await page.getByRole("link", { name: "Edit" }).click();
    await page.waitForURL("**/students/*/edit");

    const jujitsuCheckbox = page.getByRole("checkbox", { name: "Jujitsu" });
    await jujitsuCheckbox.check();
    await page.getByRole("button", { name: "Save changes" }).click();

    // Successful save returns the action state (a revalidatePath here used
    // to abort the response on Node >= 23: no toast, no refresh, stale form).
    await expect(page.getByText("Student updated.")).toBeVisible();

    // The remount-on-refresh shows the saved state...
    await expect(jujitsuCheckbox).toBeChecked();

    // ...and the saved discipline is visible on the student record.
    await page.goto(page.url().replace(/\/edit$/, ""));
    await expect(page.getByText("Jujitsu", { exact: true })).toBeVisible();
  });
});

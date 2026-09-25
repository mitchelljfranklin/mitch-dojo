import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

test.describe("belts", () => {
  // Single test: the promotion flow leaves state (kid at Advanced) that the
  // filter checks depend on, and a second login here would contend with
  // parallel spec files for the shared in-memory login rate limit.
  test("ladder, promotion with override, progression filters, and history", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    // Navigate to the discipline's progression page (global-setup creates
    // "E2E Karate" with the Novice/Advanced ladder and the attendance kid).
    await page.goto("/belts");
    await page.getByText("E2E Karate", { exact: true }).first().click();
    await page.waitForURL("**/belts/*");

    // The progression table lists only students assigned to the discipline:
    // the attendance kid is linked to E2E Karate; the NoDiscipline kid is not.
    await expect(page.getByText("E2E Attend Kid")).toBeVisible();
    await expect(page.getByText("E2E NoDiscipline Kid")).toHaveCount(0);

    // The ladder from global-setup is visible
    await expect(
      page.getByText("Novice", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Advanced", { exact: true }).first(),
    ).toBeVisible();

    // Promote the attendance kid to Novice (entry rank — always eligible).
    // The sheet defaults to the next belt in the ladder, which for an
    // unranked student is the entry belt.
    await page.getByRole("button", { name: "Promote" }).first().click();
    await page.getByRole("button", { name: "Record promotion" }).click();
    await expect(page.getByText("Promotion recorded.").first()).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click({ force: true });

    // Wait for the post-promotion refresh so the next sheet's default belt
    // is computed from the kid's NEW rank (Novice → next: Advanced).
    await expect(page.getByText(/trainings? on this discipline/)).toBeVisible();

    // Kid has at most a couple of trainings since the award — Advanced needs
    // 99, so the promotion is blocked until the instructor ticks Override.
    await page.getByRole("button", { name: "Promote" }).first().click();
    await page.getByRole("button", { name: "Record promotion" }).click();
    await expect(page.getByText(/requires 99 trainings/).first()).toBeVisible();

    await page.getByLabel("Override eligibility requirement").click();
    await page.getByRole("button", { name: "Record promotion" }).click();
    await expect(page.getByText("Promotion recorded.").first()).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click({ force: true });

    await expect(
      page.getByText("Advanced", { exact: true }).first(),
    ).toBeVisible();

    // Progression filters (still logged in, kid now at Advanced).
    const search = page.getByLabel("Filter students by name");
    const beltFilter = page.getByLabel("Filter by belt");
    const eligibilityFilter = page.getByLabel("Filter by eligibility");

    // Name search: a miss shows the empty state, a hit shows the student.
    await search.fill("zzz-no-match");
    await expect(
      page.getByText("No students match the filters."),
    ).toBeVisible();
    await search.fill("Attend");
    await expect(page.getByText("E2E Attend Kid")).toBeVisible();

    // Belt filter: Novice holds nobody (the kid is at Advanced now).
    await beltFilter.selectOption({ label: "Novice" });
    await expect(
      page.getByText("No students match the filters."),
    ).toBeVisible();
    await beltFilter.selectOption({ label: "Advanced" });
    await expect(page.getByText("E2E Attend Kid")).toBeVisible();

    // Eligibility: at the top of the ladder (no next belt) the kid is
    // neither eligible nor "needs trainings".
    await eligibilityFilter.selectOption("ELIGIBLE");
    await expect(
      page.getByText("No students match the filters."),
    ).toBeVisible();

    // Clear restores the unfiltered list.
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByText("E2E Attend Kid")).toBeVisible();
    await expect(search).toHaveValue("");

    // History is visible on the student record
    await page.goto("/students");
    await page.getByText("E2E Attend Kid").first().click();
    await page.waitForURL("**/students/*");
    await expect(page.getByText("Belt progression")).toBeVisible();
    await expect(page.getByText("Advanced").first()).toBeVisible();
  });
});

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

    // --- create a recurring plan (create once — it persists across runs) ---
    await page.goto("/memberships");
    const existingPlan = page.getByText(E2E_PLAN_NAME).first();
    if (!(await existingPlan.isVisible().catch(() => false))) {
      await page.getByRole("button", { name: "New plan" }).click();
      await page.getByLabel("Name").fill(E2E_PLAN_NAME);
      await page.getByLabel("Billing period").click();
      await page.getByRole("option", { name: "Monthly" }).click();
      await page.getByLabel(/Price/).fill("50.00");
      await page.getByRole("button", { name: "Create plan" }).click();
      await expect(page.getByText("Plan created.").first()).toBeVisible();
      await page.getByRole("button", { name: "Done" }).click({ force: true });
    }

    await expect(page.getByText(E2E_PLAN_NAME).first()).toBeVisible();

    // Enroll the e2e student from their record. On re-runs the student is
    // already enrolled — enrollment outcome is idempotent via the sheet.
    await page.goto("/students");
    await page.getByText("E2E Attend Kid").first().click();
    await page.waitForURL("**/students/*");
    await expect(page.getByText("Memberships").first()).toBeVisible();

    const alreadyEnrolled = await page
      .getByText(E2E_PLAN_NAME)
      .first()
      .isVisible()
      .catch(() => false);
    if (!alreadyEnrolled) {
      await page.getByRole("button", { name: "Enroll in plan" }).click();
      await page.getByRole("combobox", { name: "Plan" }).click();
      await page.getByRole("option", { name: E2E_PLAN_NAME }).click();
      await page.getByRole("button", { name: "Enroll", exact: true }).click();
      await expect(page.getByText("Member enrolled.").first()).toBeVisible();
      await page.getByRole("button", { name: "Done" }).click({ force: true });
      await expect(page.getByText("Since", { exact: false })).toBeVisible();
    }

    // Bill the plan manually via the sidebar's direct Invoices route,
    // tagged to the E2E Dojo location. The created
    // invoice number is captured from the toast so later assertions target
    // THIS invoice, not whichever one sorts first.
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Invoices" }).first().click();
    await page.waitForURL("**/memberships/invoices");
    await page.getByRole("button", { name: "New invoice" }).click();
    await page.getByRole("combobox", { name: "Student" }).click();
    await page.getByRole("option", { name: "E2E Attend Kid" }).click();
    await page.getByRole("combobox", { name: "Plan" }).click();
    await page.getByRole("option", { name: E2E_PLAN_NAME }).click();
    await page.getByRole("combobox", { name: "Location" }).click();
    await page.getByRole("option", { name: "E2E Dojo", exact: true }).click();
    await page.getByRole("button", { name: "Create invoice" }).click();
    const createdToast = await page
      .getByText(/Invoice #\d+ created\./)
      .first()
      .textContent();
    const invoiceNumber = createdToast?.match(/#(\d+)/)?.[1];
    await page.getByRole("button", { name: "Done" }).click({ force: true });

    // Open the captured invoice via its number link and record the full
    // payment
    await page
      .getByRole("link", { name: `#${invoiceNumber}`, exact: true })
      .click();
    await expect(page.getByText("Billed to")).toBeVisible();
    await expect(page.getByText("Location: E2E Dojo")).toBeVisible();

    // The invoice PDF is a real server-rendered download (page.request
    // shares the browser session's auth cookie)
    const pdfHref = await page
      .locator('a[href*="/api/invoices/"][href*="/pdf"]')
      .getAttribute("href");
    const pdfResponse = await page.request.get(pdfHref ?? "");
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()["content-type"]).toBe("application/pdf");
    const body = await pdfResponse.body();
    expect(body.subarray(0, 4).toString("latin1")).toBe("%PDF");

    await page.getByRole("button", { name: "Record payment" }).click();
    // The sheet's submit shares its name with the page-level button — scope
    // to the dialog so the click cannot race the sheet's mount.
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Record payment" })
      .click();
    await expect(page.getByText("Payment recorded.").first()).toBeVisible();
    // Recording the final payment flips the invoice to PAID — the page
    // refresh then unmounts the sheet itself (no Done step needed).
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Payments", { exact: true })).toBeVisible();

    // The plan list shows one active member (scoped to this test's plan —
    // parallel specs create their own plans with their own counts)
    await page.goto("/memberships");
    await expect(
      page
        .getByRole("row", { name: /E2E Monthly Membership/ })
        .getByText("1", { exact: true }),
    ).toBeVisible();
  });
});

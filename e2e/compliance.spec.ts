import { expect, test } from "@playwright/test";

import { prisma } from "@/lib/prisma";
import {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_VIEWER_EMAIL,
  E2E_VIEWER_PASSWORD,
} from "./global-setup";

const suffix = Date.now().toString(36);
let studentId: string;

async function loginAs(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

test.describe("compliance (medical + agreements)", () => {
  test("admin documents page shows the three seeded agreements", async ({
    page,
  }) => {
    await loginAs(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);

    await page.goto("/admin/documents");
    await expect(
      page.getByRole("heading", { name: "Documents" }),
    ).toBeVisible();
    for (const label of ["Privacy", "Informed consent", "Safety"]) {
      await expect(
        page.getByText(label, { exact: false }).first(),
      ).toBeVisible();
    }
  });

  test("saving a document creates a new version", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);

    await page.goto("/admin/documents");
    const safetyForm = page
      .locator("form")
      .filter({ has: page.locator('input[name="type"][value="SAFETY"]') });
    await safetyForm
      .getByLabel("Title")
      .fill(`Safety expectations E2E ${suffix}`);
    await safetyForm
      .getByLabel("Document body (Markdown)")
      .fill("Updated safety body for the e2e versioning check.");
    await safetyForm.getByRole("button", { name: /Save as version/ }).click();
    await expect(page.getByText(/Saved as version \d+/).first()).toBeVisible();

    // History shows two versions now
    const before = await prisma.agreementDocument.count({
      where: { type: "SAFETY" },
    });
    expect(before).toBeGreaterThanOrEqual(2);
  });

  test("medical section is hidden from Viewer and gated on the record", async ({
    page,
  }) => {
    // Viewer: no medical section on the student form/record
    await loginAs(page, E2E_VIEWER_EMAIL, E2E_VIEWER_PASSWORD);
    await page.goto("/students");
    await page.getByText("E2E Attend Kid").first().click();
    await page.waitForURL("**/students/*");
    await expect(page.getByText("Health & medical")).toHaveCount(0);

    // Direct form access via edit is edit-gated anyway — the assertion is
    // the record card's absence for a medical-permission-less role.
  });

  test("admin sees the medical section, compliance card, and can record a paper signature", async ({
    page,
  }) => {
    await loginAs(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);

    // Create a scratch student to work on
    await page.goto("/students/new");
    await page.getByLabel("First name").fill("Compliance");
    await page.getByLabel("Last name").fill(`Kid ${suffix}`);
    await page.getByRole("checkbox", { name: "E2E Dojo", exact: true }).click();
    await page.getByRole("checkbox", { name: "E2E Karate" }).click();
    await page
      .getByLabel("Primary (home) dojo")
      .selectOption({ label: "E2E Dojo" });
    await page.getByLabel(/Prescribed medications/).fill("None declared");
    await page.getByRole("button", { name: "Create student" }).click();
    await page.waitForURL("**/students/*");
    studentId = page.url().split("/").pop()!;

    // The medical card renders for a permitted role
    await expect(page.getByText("Health & medical")).toBeVisible();
    await expect(page.getByText("None declared")).toBeVisible();

    // The compliance card lists the three agreements, unsigned
    await expect(page.getByText("Agreements & consent")).toBeVisible();
    const privacyRow = page
      .locator("div.rounded-md.border")
      .filter({ hasText: "Privacy notice" })
      .first();
    await expect(privacyRow.getByText("Not signed")).toBeVisible();

    // Record a paper signature via the sheet
    await privacyRow.getByRole("button", { name: "Record signature" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Who signed").fill("Compliance Guardian");
    await dialog.getByRole("button", { name: "Record signature" }).click();
    await expect(page.getByText("Signature recorded.").first()).toBeVisible();

    // The card now shows the signed state (badge + description text both
    // mention signing — take the first, the badge)
    await expect(
      page
        .locator("div.rounded-md.border")
        .filter({ hasText: "Privacy notice" })
        .first()
        .getByText(/Signed/)
        .first(),
    ).toBeVisible();
  });

  test.afterAll(async () => {
    if (studentId) {
      await prisma.student
        .delete({ where: { id: studentId } })
        .catch(() => undefined);
    }
    await prisma.agreementDocument
      .deleteMany({ where: { title: { contains: `E2E ${suffix}` } } })
      .catch(() => undefined);
    await prisma.$disconnect();
  });
});

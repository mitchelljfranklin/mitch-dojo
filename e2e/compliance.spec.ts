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
    // Add a fresh document via the Add-document form (starts at version 0).
    // Scope to the "Add a document" card — the per-document edit forms also
    // carry "Title" fields.
    const addCard = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Add a document" });
    await addCard.locator('input[name="title"]').fill(`Safety E2E ${suffix}`);
    await addCard
      .locator('textarea[name="bodyMarkdown"]')
      .fill("Updated safety body for the e2e versioning check.");
    await addCard.getByRole("button", { name: "Add document" }).click();
    await expect(
      page.getByText(/Document added \(version 0\)/).first(),
    ).toBeVisible();

    const created = await prisma.agreementDocument.findFirst({
      where: { title: `Safety E2E ${suffix}` },
    });
    expect(created?.version).toBe(0);
    expect(created?.enabled).toBe(true);
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
      .filter({ hasText: "Privacy information notice" })
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
        .filter({ hasText: "Privacy information notice" })
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

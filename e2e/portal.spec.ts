import { expect, test } from "@playwright/test";

import { prisma } from "@/lib/prisma";
import { generateAccessToken, hashToken } from "@/lib/tokens";

// The portal is member-facing (no staff login). The spec creates the member
// and a magic-link token directly, then walks the same flow the emailed
// link triggers.
const suffix = Date.now().toString(36);
let studentId: string;
let locationId: string;

test.describe("member portal", () => {
  test("magic link opens the read-only portal; bad tokens are rejected", async ({
    page,
  }) => {
    const location = await prisma.location.create({
      data: { name: `Portal E2E Dojo ${suffix}`, isActive: true },
    });
    locationId = location.id;
    const student = await prisma.student.create({
      data: {
        firstName: "E2E",
        lastName: `Portal Kid ${suffix}`,
        status: "ACTIVE",
        locations: { create: { locationId: location.id, isPrimary: true } },
      },
    });
    studentId = student.id;

    const rawToken = generateAccessToken();
    await prisma.portalToken.create({
      data: {
        studentId: student.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    // The emailed link: exchange the token for a cookie, land on the portal.
    await page.goto(`http://localhost:3000/portal/welcome?token=${rawToken}`);
    await page.waitForURL("**/portal");
    await expect(
      page.getByRole("heading", { name: `E2E Portal Kid ${suffix}` }),
    ).toBeVisible();
    await expect(page.getByText("Your progress")).toBeVisible();
    await expect(page.getByText("Upcoming classes")).toBeVisible();
    await expect(page.getByText("Your account")).toBeVisible();

    // An invalid token lands on the friendly rejection page (no cookie —
    // a still-valid cookie would take precedence by design).
    await page.context().clearCookies();
    await page.goto("/portal/welcome?token=garbage");
    await page.waitForURL("**/portal?error=invalid");
    await expect(page.getByText("Portal access needed")).toBeVisible();
  });
  test("documents section shows agreements and digital signing persists", async ({
    page,
  }) => {
    const location = await prisma.location.create({
      data: { name: `Portal Docs Dojo ${suffix}`, isActive: true },
    });
    const student = await prisma.student.create({
      data: {
        firstName: "E2E",
        lastName: `Docs Kid ${suffix}`,
        status: "ACTIVE",
        locations: { create: { locationId: location.id, isPrimary: true } },
      },
    });
    const docStudentId = student.id;

    const rawToken = generateAccessToken();
    await prisma.portalToken.create({
      data: {
        studentId: student.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    await page.goto(`http://localhost:3000/portal/welcome?token=${rawToken}`);
    await page.waitForURL("**/portal");
    // The portal page is heavy — interacting pre-hydration loses the
    // form action entirely (known React 19 native-submit race).
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    // The seeded privacy notice appears, unsigned
    await expect(page.getByText("Documents & consent")).toBeVisible();
    const privacyDetails = page
      .locator("details")
      .filter({ hasText: "Privacy notice" })
      .first();
    await expect(privacyDetails).toBeVisible();
    await expect(privacyDetails.getByText("Signature needed")).toBeVisible();

    // Open the document, confirm, sign
    await privacyDetails.locator("summary").click();
    await privacyDetails.getByRole("checkbox").click();
    await privacyDetails
      .getByLabel("Type your name to sign")
      .fill("Portal Guardian");
    await privacyDetails.getByRole("button", { name: /Sign Privacy/ }).click();

    // Durable assertion: the signature row lands in the DB (toasts are
    // transient and can race the assertion).
    await expect
      .poll(
        async () => {
          const signature = await prisma.studentAgreement.findFirst({
            where: { studentId: docStudentId, method: "PORTAL" },
          });
          return signature?.signedByName ?? "";
        },
        { timeout: 10_000 },
      )
      .toBe("Portal Guardian");

    // The signature persisted — reopening shows the signed state
    await page.reload();
    const signedDetails = page
      .locator("details")
      .filter({ hasText: "Privacy notice" })
      .first();
    await expect(signedDetails.getByText(/Signed/).first()).toBeVisible();

    await prisma.student
      .delete({ where: { id: docStudentId } })
      .catch(() => undefined);
    await prisma.location
      .delete({ where: { id: location.id } })
      .catch(() => undefined);
  });
});

test.afterAll(async () => {
  if (studentId) {
    await prisma.student
      .delete({ where: { id: studentId } })
      .catch(() => undefined);
  }
  if (locationId) {
    await prisma.location
      .delete({ where: { id: locationId } })
      .catch(() => undefined);
  }
  await prisma.$disconnect();
});

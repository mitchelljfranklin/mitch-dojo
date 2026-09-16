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

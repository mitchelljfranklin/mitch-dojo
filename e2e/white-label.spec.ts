import { expect, test } from "@playwright/test";

import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

// 1x1 transparent PNG — enough for the upload allowlist (extension +
// magic bytes) and the <img> render assertions.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const LOGO_KEY = `e2e-logo-${Date.now()}.png`;

test.describe("white-label", () => {
  test("booking page renders org name, custom headline, and the logo", async ({
    page,
  }) => {
    // Persist the brand assets the way the appearance action would (the
    // multipart upload path is exercised manually; here we test rendering).
    await storage.save(LOGO_KEY, TINY_PNG);
    await prisma.appSetting.upsert({
      where: { key: "appearance.logoKey" },
      update: { value: LOGO_KEY },
      create: {
        key: "appearance.logoKey",
        category: "appearance",
        value: LOGO_KEY,
      },
    });

    // The public booking page: org eyebrow, org name, headline, and logo
    await page.goto("/book");
    await expect(page.getByText("My Dojo", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Book a free trial class" }),
    ).toBeVisible();
    await expect(page.locator('img[src*="/api/brand/logo"]')).toBeVisible();

    // The member portal carries the same brand mark
    await page.goto("/portal");
    await expect(page.getByText("Portal access needed")).toBeVisible();
  });

  test.afterAll(async () => {
    await storage.delete(LOGO_KEY).catch(() => undefined);
    await prisma.appSetting
      .deleteMany({ where: { key: "appearance.logoKey" } })
      .catch(() => undefined);
    await prisma.$disconnect();
  });
});

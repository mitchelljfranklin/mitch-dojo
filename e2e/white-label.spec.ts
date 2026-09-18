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
const LOGO_DARK_KEY = `e2e-logo-dark-${Date.now()}.png`;

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
    // The primary logo renders bare (no plate) — variants control contrast.
    await expect(
      page.locator('img[src*="/api/brand/logo"]:not([src*="variant=dark"])'),
    ).toBeVisible();

    // Seed the dark-background logo too: /book should carry both variants
    // (CSS picks the visible one per theme) and the dark route must serve.
    await storage.save(LOGO_DARK_KEY, TINY_PNG);
    await prisma.appSetting.upsert({
      where: { key: "appearance.logoDarkKey" },
      update: { value: LOGO_DARK_KEY },
      create: {
        key: "appearance.logoDarkKey",
        category: "appearance",
        value: LOGO_DARK_KEY,
      },
    });
    await page.goto("/book");
    // Both variants in the DOM: primary visible in light mode (Playwright
    // default), dark variant present but hidden until dark mode is active.
    await expect(
      page.locator('img[src*="/api/brand/logo?variant=dark"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('img[src*="/api/brand/logo?variant=dark"]'),
    ).toBeHidden();
    await expect(
      page.locator('img[src*="/api/brand/logo"]:not([src*="variant=dark"])'),
    ).toBeVisible();
    const darkResponse = await page.request.get("/api/brand/logo?variant=dark");
    expect(darkResponse.status()).toBe(200);
    expect(darkResponse.headers()["content-type"]).toBe("image/png");

    // The member portal carries the same brand mark
    await page.goto("/portal");
    await expect(page.getByText("Portal access needed")).toBeVisible();
  });

  test.afterAll(async () => {
    await storage.delete(LOGO_KEY).catch(() => undefined);
    await storage.delete(LOGO_DARK_KEY).catch(() => undefined);
    await prisma.appSetting
      .deleteMany({
        where: {
          key: { in: ["appearance.logoKey", "appearance.logoDarkKey"] },
        },
      })
      .catch(() => undefined);
    await prisma.$disconnect();
  });
});

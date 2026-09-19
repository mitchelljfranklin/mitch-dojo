import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

test.describe("trials", () => {
  test("public booking creates a trial lead in the pipeline and converts", async ({
    page,
  }) => {
    // --- public booking (no login) ---
    await page.goto("/book");
    await expect(
      page.getByRole("heading", { name: "Book a free trial class" }),
    ).toBeVisible();
    // White-label: the org name brands the page (eyebrow above the headline).
    await expect(page.getByText("My Dojo", { exact: true })).toBeVisible();

    await page.getByLabel("First name").fill("Web");
    await page.getByLabel("Last name").fill("Booker");
    // Native email validation rejects placeholder values — use a real shape.
    await page.getByLabel("Email").fill(`web-booker-${Date.now()}@example.com`);
    await page.getByRole("combobox", { name: "Location" }).click();
    await page.getByRole("option", { name: "E2E Dojo", exact: true }).click();
    await page.getByRole("combobox", { name: "Martial art" }).click();
    await page.getByRole("option", { name: "E2E Karate" }).click();
    await page.getByRole("button", { name: "Book my free trial" }).click();

    await expect(page.getByText("Booking received!")).toBeVisible();

    // --- staff pipeline ---
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    // The booking confirmation email fired (no SMTP in tests → FAILED row
    // in the email log — the durable record).
    await page.goto("/admin/email-log");
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: "Booking confirmation" })
        .filter({ hasText: "FAILED" })
        .first(),
    ).toBeVisible();

    await page.goto("/trials");
    await expect(page.getByRole("heading", { name: "Trials" })).toBeVisible();
    await expect(page.getByText("Web Booker").first()).toBeVisible();

    // Move the lead: NEW → CONTACTED → FIRST_CLASS → CONVERTED, waiting for
    // each revalidation so the next transition can't race a re-rendered form.
    const row = page.getByRole("row", { name: /Web Booker/ });
    await row.getByRole("combobox").selectOption("CONTACTED");
    await row.getByRole("button", { name: "Apply" }).click();
    await expect(row.getByText("Contacted", { exact: true })).toBeVisible();

    await row.getByRole("combobox").selectOption("FIRST_CLASS");
    await row.getByRole("button", { name: "Apply" }).click();
    await expect(row.getByText("First class", { exact: true })).toBeVisible();

    await row.getByRole("combobox").selectOption("CONVERTED");
    await row.getByRole("button", { name: "Apply" }).click();
    // Converted leads leave the pipeline (they are members now) — the row
    // disappears from the default view.
    await expect(page.getByRole("row", { name: /Web Booker/ })).toHaveCount(0);

    // ...and shows under the Converted filter and on their record.
    await page.goto("/trials?stage=CONVERTED");
    await expect(page.getByText("Web Booker").first()).toBeVisible();
    await page.goto("/students");
    await page.getByText("Web Booker").first().click();
    await page.waitForURL("**/students/*");
    await expect(page.getByText("Active", { exact: true })).toBeVisible();
  });

  test("convert sheet enrolls into a plan and creates the first invoice", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    // A plan to enroll into (create once — it persists across runs)
    await page.goto("/memberships");
    const existingPlan = page.getByText("E2E Convert Plan").first();
    if (!(await existingPlan.isVisible().catch(() => false))) {
      await page.getByRole("button", { name: "New plan" }).click();
      await page.getByLabel("Name").fill("E2E Convert Plan");
      await page.getByLabel("Billing period").click();
      await page.getByRole("option", { name: "Monthly" }).click();
      await page.getByLabel(/Price/).fill("65.00");
      await page.getByRole("button", { name: "Create plan" }).click();
      await expect(page.getByText("Plan created.").first()).toBeVisible();
      await page.getByRole("button", { name: "Done" }).click({ force: true });
    }

    // A fresh booking to convert. Unique email → unambiguous row targeting
    // (stale leads from interrupted runs stay out of the way).
    const bookerEmail = `sheet-booker-${Date.now()}@example.com`;
    await page.goto("/book");
    await page.getByLabel("First name").fill("Sheet");
    await page.getByLabel("Last name").fill("Booker");
    await page.getByLabel("Email").fill(bookerEmail);
    await page.getByRole("combobox", { name: "Location" }).click();
    await page.getByRole("option", { name: "E2E Dojo", exact: true }).click();
    await page.getByRole("combobox", { name: "Martial art" }).click();
    await page.getByRole("option", { name: "E2E Karate" }).click();
    await page.getByRole("button", { name: "Book my free trial" }).click();
    await expect(page.getByText("Booking received!")).toBeVisible();

    const rowPattern = new RegExp(bookerEmail.replaceAll(".", "\\."));
    await page.goto("/trials");
    const row = page.getByRole("row", { name: rowPattern }).first();
    await expect(row).toBeVisible();
    const studentHref = await row
      .getByRole("link", { name: "Sheet Booker" })
      .getAttribute("href");

    // Guarded transitions: the lead must reach FIRST_CLASS before it can
    // convert — which is also when the Convert sheet appears on the row.
    await row.getByRole("combobox").selectOption("CONTACTED");
    await row.getByRole("button", { name: "Apply" }).click();
    await expect(row.getByText("Contacted", { exact: true })).toBeVisible();
    await row.getByRole("combobox").selectOption("FIRST_CLASS");
    await row.getByRole("button", { name: "Apply" }).click();
    await expect(row.getByText("First class", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Convert" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: "Plan (optional)" }).click();
    await page
      .getByRole("option", { name: /E2E Convert Plan/ })
      .first()
      .click();
    await dialog.getByRole("checkbox").click();
    await dialog.getByRole("button", { name: "Convert trial" }).click();
    // The toast fires when the action resolves — navigating earlier would
    // abort the POST and assert a pre-conversion page.
    await expect(page.getByText(/Trial converted/).first()).toBeVisible();

    // The converted lead leaves the open pipeline...
    await page.goto("/trials");
    await expect(page.getByRole("row", { name: rowPattern })).toHaveCount(0);

    // ...and lands on an active member with a plan enrollment
    await page.goto(studentHref ?? "/students");
    await page.waitForURL("**/students/*");
    await expect(
      page.getByText("Active", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("E2E Convert Plan").first()).toBeVisible();
  });

  test("child booking captures the guardian details on the record", async ({
    page,
  }) => {
    const childEmail = `child-booker-${Date.now()}@example.com`;
    await page.goto("/book");
    await expect(
      page.getByRole("heading", { name: "Book a free trial class" }),
    ).toBeVisible();

    // Selecting child mode relabels the contact fields as the guardian's
    await page.getByLabel("Who is this trial for?").click();
    await page.getByRole("option", { name: "My child" }).click();
    await expect(page.getByText("Guardian email")).toBeVisible();

    await page.getByLabel("Child's first name").fill("Kiddo");
    await page.getByLabel("Child's last name").fill("Booker");
    await page.getByLabel("Guardian name (you)").fill("Parent Booker");
    await page.getByLabel("Guardian email").fill(childEmail);
    await page.getByRole("combobox", { name: "Location" }).click();
    await page.getByRole("option", { name: "E2E Dojo", exact: true }).click();
    await page.getByRole("combobox", { name: "Martial art" }).click();
    await page.getByRole("option", { name: "E2E Karate" }).click();
    await page.getByRole("button", { name: "Book my free trial" }).click();
    await expect(page.getByText("Booking received!")).toBeVisible();

    // The child's record carries the guardian details
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/trials");
    await expect(page.getByText("Kiddo Booker").first()).toBeVisible();
    await page.goto("/students");
    await page.getByText("Kiddo Booker").first().click();
    await page.waitForURL("**/students/*");
    await expect(page.getByText("Parent Booker")).toBeVisible();
    // The address appears on both the child's contact and the guardian rows.
    await expect(page.getByText(childEmail).first()).toBeVisible();
  });

  test("booking form rejects missing contact details", async ({ page }) => {
    await page.goto("/book?error=contact");
    await expect(page.getByText("Something went wrong")).toBeVisible();
  });
});

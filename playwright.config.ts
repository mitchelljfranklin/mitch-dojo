import { defineConfig } from "@playwright/test";
import path from "node:path";

// The standalone server chdirs to .next/standalone, so a relative
// DATA_STORAGE_PATH would make the server use a different storage root
// than the specs (whose cwd is the repo root). Pin an absolute path for
// BOTH processes — the config sets it before test files load, and the
// webServer env passes it to the spawned server.
process.env.DATA_STORAGE_PATH ??= path.resolve(".storage/files");

// lib/env validates these unconditionally — also in this config process when
// global-setup imports lib/prisma. Placeholder values are safe for e2e.
process.env.AUTH_SECRET ??= "e2e-only-auth-secret-00000000000000000000";
process.env.APP_ENCRYPTION_KEY ??=
  "e2e-only-encryption-key-00000000000000000000";

// Safety guard mirroring vitest.setup.ts: specs write and reset data through
// their own Prisma connection using the ambient DATABASE_URL, so an e2e run
// against a non-test database mutates real state. The webServer pin below
// only fixes the server process — the guard protects the spec process.
const databaseUrl = process.env.DATABASE_URL ?? "";
const looksLikeTestDatabase = /test/i.test(databaseUrl);
if (!looksLikeTestDatabase && process.env.ALLOW_TESTS_ON_THIS_DB !== "1") {
  throw new Error(
    [
      "Refusing to run e2e against a non-test database.",
      `  DATABASE_URL = ${databaseUrl.replace(/(:\/\/[^:/@]+:)[^@]*(@)/, "$1****$2")}`,
      "",
      "e2e specs mutate and reset data (settings, users, roles).",
      "Set DATABASE_URL to a dedicated test database, e.g.:",
      '  $env:DATABASE_URL="postgresql://mitch:mitch@localhost:5432/mitch_dojo_test?schema=public"',
      "(TEST_DATABASE_URL alone is not enough — specs read DATABASE_URL.)",
    ].join("\n"),
  );
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: 30_000,
  fullyParallel: false,
  // One retry absorbs rare render-timing flakes (e.g. the heavyweight
  // settings page occasionally exceeding its first-paint assertion window).
  retries: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
  },
  // Two projects: the main suite runs in parallel, then the sso project
  // runs afterwards. The SSO specs seed global sign-in settings (including
  // SSO-only mode, which hides the local login form) — running them after
  // the main suite avoids breaking concurrent logins in other specs.
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
      testIgnore: /sso\.spec\.ts/,
    },
    {
      name: "sso-serial",
      use: { browserName: "chromium" },
      testMatch: /sso\.spec\.ts/,
      dependencies: ["chromium"],
    },
  ],
  webServer: {
    command: "node .next/standalone/server.js",
    url: "http://localhost:3000",
    // Never reuse a locally-running server: a dev server on the repo .env
    // (dev DB) makes server-side writes land in dev while specs hit the
    // test database — the silent split-brain that once wiped live settings.
    // CI already starts a fresh production server so e2e truly exercises
    // the prod build; local runs now do the same (standalone server starts
    // in well under a second).
    reuseExistingServer: false,
    timeout: 120_000,
    // `next start` runs in production mode, where CRON_SECRET is required.
    // Pin the app/auth URL to localhost so the suite works regardless of the
    // developer's .env (which may point APP_URL at a real deployment — that
    // would make NextAuth redirect sign-in off localhost and break every test).
    env: {
      // >=32 chars so the production CRON_SECRET validation accepts it.
      CRON_SECRET:
        process.env.CRON_SECRET ?? "e2e-only-cron-secret-0123456789abcdef",
      APP_URL: "http://localhost:3000",
      AUTH_URL: "http://localhost:3000",
      // lib/env validates these unconditionally; placeholders are fine for e2e.
      AUTH_SECRET:
        process.env.AUTH_SECRET ?? "e2e-only-auth-secret-00000000000000000000",
      APP_ENCRYPTION_KEY:
        process.env.APP_ENCRYPTION_KEY ??
        "e2e-only-encryption-key-00000000000000000000",
      // Pin the app to the same database the specs use (the ambient
      // DATABASE_URL, guarded above). Without this the standalone server
      // loads the repo .env (dev DB) at runtime and server-side writes
      // silently land in dev instead of the isolated test DB.
      DATABASE_URL: databaseUrl,
      DATABASE_PROVIDER: process.env.DATABASE_PROVIDER ?? "postgres",
      DATA_STORAGE_PATH: process.env.DATA_STORAGE_PATH,
      // Keep the scheduler's boot-time pass out of the test run so specs see a
      // deterministic state (the 5-minute interval still runs).
      SCHEDULER_RUN_ON_BOOT: "false",
    },
  },
});

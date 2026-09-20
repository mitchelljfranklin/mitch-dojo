import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  getEmailSecret,
  getEmailSettings,
  updateEmailSettings,
} from "@/lib/settings";
import { getTransporter } from "./mailer";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

const EMAIL_KEYS = [
  "email.smtpHost",
  "email.smtpAuthType",
  "email.smtpOAuth2Provider",
  "email.smtpOAuth2ClientId",
  "email.smtpOAuth2Tenant",
  "email.smtpOAuth2ClientSecret",
  "email.smtpOAuth2RefreshToken",
];

beforeAll(async () => {
  await prisma.appSetting.deleteMany({
    where: { key: { in: EMAIL_KEYS } },
  });
});

afterAll(async () => {
  await prisma.appSetting.deleteMany({
    where: { key: { in: EMAIL_KEYS } },
  });
  await prisma.$disconnect();
});

type TransportOptions = {
  auth?: Record<string, unknown> & { user?: string; pass?: string };
};

async function transportOptions(): Promise<TransportOptions> {
  const transport = await getTransporter();
  expect(transport).not.toBeNull();
  return (transport as unknown as { options: TransportOptions }).options;
}

describe.skipIf(!hasTestDatabase)("email oauth2 settings", () => {
  it("round-trips oauth2 fields and keeps secrets out of the view", async () => {
    await updateEmailSettings({
      smtpAuthType: "oauth2",
      smtpOAuth2Provider: "microsoft",
      smtpOAuth2ClientId: "client-round",
      smtpOAuth2Tenant: "tenant-123",
      smtpOAuth2ClientSecret: "secret-round",
      smtpOAuth2RefreshToken: "refresh-round",
    });

    const view = await getEmailSettings();
    expect(view.smtpAuthType).toBe("oauth2");
    expect(view.smtpOAuth2Provider).toBe("microsoft");
    expect(view.smtpOAuth2Tenant).toBe("tenant-123");
    expect(view.smtpOAuth2ClientSecretConfigured).toBe(true);
    expect(view.smtpOAuth2RefreshTokenConfigured).toBe(true);
    // Secrets never reach the client view
    const raw = JSON.stringify(view);
    expect(raw).not.toContain("secret-round");
    expect(raw).not.toContain("refresh-round");

    // Decryptable on demand
    await expect(getEmailSecret("smtpOAuth2ClientSecret")).resolves.toBe(
      "secret-round",
    );
    await expect(getEmailSecret("smtpOAuth2RefreshToken")).resolves.toBe(
      "refresh-round",
    );
  });

  it("keeps stored oauth2 secrets when a save sends blanks", async () => {
    const before = await getEmailSecret("smtpOAuth2RefreshToken");
    expect(before).toBe("refresh-round");
    await updateEmailSettings({
      smtpOAuth2ClientSecret: "",
      smtpOAuth2RefreshToken: "",
    });
    await expect(getEmailSecret("smtpOAuth2RefreshToken")).resolves.toBe(
      "refresh-round",
    );
  });
});

describe.skipIf(!hasTestDatabase)("smtp transport auth", () => {
  it("builds an OAUTH2 auth block with the Microsoft token endpoint", async () => {
    await updateEmailSettings({
      smtpHost: "smtp.office365.com",
      smtpAuthType: "oauth2",
      smtpOAuth2Provider: "microsoft",
      smtpOAuth2ClientId: "client-id-1",
      smtpOAuth2Tenant: "tenant-abc",
      smtpOAuth2ClientSecret: "test-secret",
      smtpOAuth2RefreshToken: "test-refresh",
    });

    const options = await transportOptions();
    const auth = options.auth!;
    expect(auth.type).toBe("OAUTH2");
    expect(auth.user).toBe("[EMAIL]");
    expect(auth.clientId).toBe("client-id-1");
    expect(auth.refreshToken).toBe("test-refresh");
    expect(String(auth.accessUrl)).toContain(
      "login.microsoftonline.com/tenant-abc/oauth2/v2.0/token",
    );
    expect((auth.customParams as Record<string, string>).scope).toBe(
      "https://outlook.office365.com/SMTP.Send",
    );
  });

  it("builds an OAUTH2 auth block with Google defaults", async () => {
    await updateEmailSettings({
      smtpHost: "smtp.gmail.com",
      smtpAuthType: "oauth2",
      smtpOAuth2Provider: "google",
      smtpOAuth2ClientId: "google-id",
      smtpOAuth2ClientSecret: "google-secret",
      smtpOAuth2RefreshToken: "google-refresh",
    });

    const options = await transportOptions();
    const auth = options.auth!;
    expect(auth.type).toBe("OAUTH2");
    // Google uses Nodemailer's default access URL — no override set.
    expect(auth.accessUrl).toBeUndefined();
    expect(auth.clientId).toBe("google-id");
    expect(auth.refreshToken).toBe("google-refresh");
  });

  it("builds basic auth by default and when oauth2 credentials are missing", async () => {
    await updateEmailSettings({
      smtpHost: "smtp.example.com",
      smtpAuthType: "basic",
      smtpPassword: "pw-123",
    });

    let options = await transportOptions();
    expect(options.auth!.type).toBeUndefined();
    expect(options.auth!.pass).toBe("pw-123");

    // oauth2 mode with missing credentials falls back to basic so the send
    // failure lands in the email log with the provider's error.
    await updateEmailSettings({
      smtpAuthType: "oauth2",
      smtpOAuth2ClientId: "",
      smtpOAuth2ClientSecret: "",
      smtpOAuth2RefreshToken: "",
    });
    options = await transportOptions();
    expect(options.auth!.type).toBeUndefined();
    expect(options.auth!.pass).toBe("pw-123");
  });
});

import { type Prisma } from "../../prisma/generated/prisma/client";
import { cache } from "react";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

import {
  type OperationsSettings,
  type EmailSettings,
  type EmailTemplateSettings,
  type FileSettings,
  type OrganizationSettings,
  type AppearanceSettings,
  type StorageSettings,
  type CronSettings,
  type MembershipsSettings,
  type CommunicationsSettings,
  type SsoSettings,
  operationsSettingsSchema,
  emailSettingsSchema,
  emailTemplateSchema,
  fileSettingsSchema,
  organizationSettingsSchema,
  appearanceSettingsSchema,
  storageSettingsSchema,
  cronSettingsSchema,
  membershipsSettingsSchema,
  communicationsSettingsSchema,
  ssoSettingsSchema,
} from "./schema";

function makeKey(category: string, field: string): string {
  return `${category}.${field}`;
}

const NO_SECRETS = new Set<string>();

async function readCategoryRecord(
  category: string,
): Promise<Record<string, unknown>> {
  const rows = await prisma.appSetting.findMany({ where: { category } });
  const record: Record<string, unknown> = {};
  const prefix = `${category}.`;

  for (const row of rows) {
    const field = row.key.startsWith(prefix)
      ? row.key.slice(prefix.length)
      : row.key;
    record[field] = row.value;
  }

  return record;
}

async function persistCategory(
  category: string,
  values: Record<string, unknown>,
  secretFields: ReadonlySet<string>,
): Promise<void> {
  const operations = Object.entries(values).flatMap(([field, rawValue]) => {
    const isSecret = secretFields.has(field);

    if (isSecret && (typeof rawValue !== "string" || rawValue.length === 0)) {
      return [];
    }

    const storedValue = (
      isSecret ? encryptSecret(rawValue as string) : rawValue
    ) as Prisma.InputJsonValue;
    const key = makeKey(category, field);

    return [
      prisma.appSetting.upsert({
        where: { key },
        update: { value: storedValue, category, isSecret },
        create: { key, category, value: storedValue, isSecret },
      }),
    ];
  });

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }
}

export const getOrganizationSettings = cache(
  async (): Promise<OrganizationSettings> => {
    const record = await readCategoryRecord("organization");
    return organizationSettingsSchema.parse(record);
  },
);

export async function updateOrganizationSettings(
  input: OrganizationSettings,
): Promise<void> {
  await persistCategory("organization", input, NO_SECRETS);
}

const EMAIL_SECRET_FIELDS: ReadonlySet<string> = new Set([
  "smtpPassword",
  "smtpOAuth2ClientSecret",
  "smtpOAuth2RefreshToken",
]);

export type EmailSettingsView = Omit<
  EmailSettings,
  "smtpPassword" | "smtpOAuth2ClientSecret" | "smtpOAuth2RefreshToken"
> & {
  smtpPasswordConfigured: boolean;
  smtpOAuth2ClientSecretConfigured: boolean;
  smtpOAuth2RefreshTokenConfigured: boolean;
};

export async function getEmailSettings(): Promise<EmailSettingsView> {
  const record = await readCategoryRecord("email");
  const smtpPasswordConfigured =
    typeof record.smtpPassword === "string" && record.smtpPassword.length > 0;
  const smtpOAuth2ClientSecretConfigured =
    typeof record.smtpOAuth2ClientSecret === "string" &&
    record.smtpOAuth2ClientSecret.length > 0;
  const smtpOAuth2RefreshTokenConfigured =
    typeof record.smtpOAuth2RefreshToken === "string" &&
    record.smtpOAuth2RefreshToken.length > 0;
  const parsed = emailSettingsSchema.parse({
    ...record,
    smtpPassword: "",
    smtpOAuth2ClientSecret: "",
    smtpOAuth2RefreshToken: "",
  });

  return {
    smtpHost: parsed.smtpHost,
    smtpPort: parsed.smtpPort,
    smtpUser: parsed.smtpUser,
    fromAddress: parsed.fromAddress,
    fromName: parsed.fromName,
    smtpAuthType: parsed.smtpAuthType,
    smtpOAuth2Provider: parsed.smtpOAuth2Provider,
    smtpOAuth2ClientId: parsed.smtpOAuth2ClientId,
    smtpOAuth2Tenant: parsed.smtpOAuth2Tenant,
    smtpPasswordConfigured,
    smtpOAuth2ClientSecretConfigured,
    smtpOAuth2RefreshTokenConfigured,
  };
}

// Accepts a partial update: stored values are merged over so callers can
// change only the fields their form owns without resetting the rest. Empty
// secret fields keep the stored secret (persistCategory skips them).
export async function updateEmailSettings(
  input: Partial<EmailSettings>,
): Promise<void> {
  const record = await readCategoryRecord("email");
  // Parse with secrets blanked so merged secret values are empty when the
  // caller omits them — otherwise the stored (already-encrypted) blob would
  // be re-encrypted on every partial save.
  const merged = emailSettingsSchema.parse({
    ...record,
    smtpPassword: "",
    smtpOAuth2ClientSecret: "",
    smtpOAuth2RefreshToken: "",
  });
  await persistCategory(
    "email",
    { ...merged, ...input } as unknown as Record<string, unknown>,
    EMAIL_SECRET_FIELDS,
  );
}

export async function getFileSettings(): Promise<FileSettings> {
  const record = await readCategoryRecord("files");
  return fileSettingsSchema.parse(record);
}

// A stored secret that can't be decrypted (almost always because
// APP_ENCRYPTION_KEY changed) must degrade gracefully — email stops working
// and it's logged — rather than throw and 500 every page that reads a secret.
function safeDecryptSecret(value: string, settingKey: string): string | null {
  try {
    return decryptSecret(value);
  } catch (error) {
    console.error(
      `[settings] failed to decrypt "${settingKey}" — has APP_ENCRYPTION_KEY changed? Re-save this secret to fix.`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

// Decrypts an email-category secret field (smtpPassword, SMTP OAuth2
// secrets, …). Returns null when unset or undecryptable.
export async function getEmailSecret(
  field: string = "smtpPassword",
): Promise<string | null> {
  const key = `email.${field}`;
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row || typeof row.value !== "string" || row.value.length === 0) {
    return null;
  }
  return safeDecryptSecret(row.value, key);
}

export async function getOperationsSettings(): Promise<OperationsSettings> {
  const record = await readCategoryRecord("operations");
  return operationsSettingsSchema.parse(record);
}

// Accepts a partial update: stored values are merged over so callers can
// change only the fields their form owns without resetting the rest.
export async function updateOperationsSettings(
  input: Partial<OperationsSettings>,
): Promise<void> {
  const record = await readCategoryRecord("operations");
  const merged = operationsSettingsSchema.parse(record);
  await persistCategory(
    "operations",
    { ...merged, ...input } as unknown as Record<string, unknown>,
    NO_SECRETS,
  );
}

const EMAIL_TEMPLATE_CATEGORY = "email.template";

export async function getEmailTemplateSettings(): Promise<EmailTemplateSettings> {
  const record = await readCategoryRecord(EMAIL_TEMPLATE_CATEGORY);
  return emailTemplateSchema.parse(record);
}

export async function updateEmailTemplateFields(
  fields: Partial<Record<keyof EmailTemplateSettings, string>>,
): Promise<void> {
  await persistCategory(
    EMAIL_TEMPLATE_CATEGORY,
    fields as Record<string, unknown>,
    NO_SECRETS,
  );
}

export const getAppearanceSettings = cache(
  async (): Promise<AppearanceSettings> => {
    const record = await readCategoryRecord("appearance");
    return appearanceSettingsSchema.parse(record);
  },
);

export async function updateAppearanceSettings(
  input: AppearanceSettings,
): Promise<void> {
  await persistCategory(
    "appearance",
    input as unknown as Record<string, unknown>,
    NO_SECRETS,
  );
}

const STORAGE_SECRET_FIELDS: ReadonlySet<string> = new Set([
  "s3SecretAccessKey",
  "azureConnectionString",
]);

export const getStorageSettings = cache(async (): Promise<StorageSettings> => {
  const record = await readCategoryRecord("storage");
  const parsed = storageSettingsSchema.parse(record);

  if (parsed.s3SecretAccessKey) {
    parsed.s3SecretAccessKey =
      safeDecryptSecret(parsed.s3SecretAccessKey, "s3SecretAccessKey") ?? "";
  }
  if (parsed.azureConnectionString) {
    parsed.azureConnectionString =
      safeDecryptSecret(
        parsed.azureConnectionString,
        "azureConnectionString",
      ) ?? "";
  }

  return parsed;
});

export type StorageSettingsView = Omit<
  StorageSettings,
  "s3SecretAccessKey" | "azureConnectionString"
> & {
  s3SecretConfigured: boolean;
  azureConnectionStringConfigured: boolean;
};

// Safe-for-client view of storage settings mirroring getEmailSettings():
// decrypted secrets never leave the server; only presence booleans do.
// The full secrets are re-read inside lib/storage when connections are made.
export async function getStorageSettingsView(): Promise<StorageSettingsView> {
  const record = await readCategoryRecord("storage");
  const parsed = storageSettingsSchema.parse(record);
  const resolveSecretPresence = (
    field: string,
  ): { stored: string; configured: boolean } => {
    const raw = record[field];
    const stored =
      typeof raw === "string" && raw.length > 0
        ? (safeDecryptSecret(raw, field) ?? "")
        : "";
    return { stored, configured: stored.length > 0 };
  };
  const s3 = resolveSecretPresence("s3SecretAccessKey");
  const azure = resolveSecretPresence("azureConnectionString");

  return {
    provider: parsed.provider,
    s3Bucket: parsed.s3Bucket,
    s3Region: parsed.s3Region,
    s3AccessKeyId: parsed.s3AccessKeyId,
    azureContainerName: parsed.azureContainerName,
    s3SecretConfigured: s3.configured,
    azureConnectionStringConfigured: azure.configured,
  };
}

export async function updateStorageSettings(
  input: StorageSettings,
): Promise<void> {
  await persistCategory(
    "storage",
    input as unknown as Record<string, unknown>,
    STORAGE_SECRET_FIELDS,
  );
}

// Not cache(): the scheduler tick must re-read the toggle each run so
// disabling it in Settings takes effect without a restart. The "cron"
// category also holds cron.lastRun; zod strips that unknown key.
export async function getCronSettings(): Promise<CronSettings> {
  const record = await readCategoryRecord("cron");
  return cronSettingsSchema.parse(record);
}

export async function updateCronSettings(input: CronSettings): Promise<void> {
  await persistCategory("cron", input, NO_SECRETS);
}

// Not cache(): the scheduler's invoice-generation job must re-read the
// toggle each run so disabling it takes effect without a restart.
export async function getMembershipsSettings(): Promise<MembershipsSettings> {
  const record = await readCategoryRecord("memberships");
  return membershipsSettingsSchema.parse(record);
}

export async function updateMembershipsSettings(
  input: Partial<MembershipsSettings>,
): Promise<void> {
  const record = await readCategoryRecord("memberships");
  const merged = membershipsSettingsSchema.parse(record);
  await persistCategory(
    "memberships",
    { ...merged, ...input } as unknown as Record<string, unknown>,
    NO_SECRETS,
  );
}

// Not cache(): the scheduler's reminder jobs must re-read the toggles and
// windows each run so changes take effect without a restart.
export async function getCommunicationsSettings(): Promise<CommunicationsSettings> {
  const record = await readCategoryRecord("communications");
  return communicationsSettingsSchema.parse(record);
}

export async function updateCommunicationsSettings(
  input: Partial<CommunicationsSettings>,
): Promise<void> {
  const record = await readCategoryRecord("communications");
  const merged = communicationsSettingsSchema.parse(record);
  await persistCategory(
    "communications",
    { ...merged, ...input } as unknown as Record<string, unknown>,
    NO_SECRETS,
  );
}

export async function getAuditRetention(): Promise<number> {
  const row = await prisma.appSetting.findUnique({
    where: { key: "audit.retentionDays" },
  });
  return (row && typeof row.value === "number" ? row.value : 0) as number;
}

export async function updateAuditRetention(days: number): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: "audit.retentionDays" },
    update: { value: days },
    create: { key: "audit.retentionDays", category: "audit", value: days },
  });
}

export async function getEmailLogRetention(): Promise<number> {
  const row = await prisma.appSetting.findUnique({
    where: { key: "operations.emailLogRetentionDays" },
  });
  return (row && typeof row.value === "number" ? row.value : 14) as number;
}

export async function updateEmailLogRetention(days: number): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: "operations.emailLogRetentionDays" },
    update: { value: days },
    create: {
      key: "operations.emailLogRetentionDays",
      category: "operations",
      value: days,
    },
  });
}

const SSO_SECRET_FIELDS: ReadonlySet<string> = new Set([
  "entraIdClientSecret",
  "googleClientSecret",
  "oidcClientSecret",
]);

const SSO_SECRET_KEYS: Record<string, string> = {
  entraId: "sso.entraIdClientSecret",
  google: "sso.googleClientSecret",
  oidc: "sso.oidcClientSecret",
};

export type SsoSettingsView = SsoSettings & {
  entraIdSecretConfigured: boolean;
  googleSecretConfigured: boolean;
  oidcSecretConfigured: boolean;
};

// Safe-for-client view mirroring getEmailSettings(): decrypted secrets never
// leave the server; only presence booleans do.
export async function getSsoSettings(): Promise<SsoSettingsView> {
  const record = await readCategoryRecord("sso");
  const parsed = ssoSettingsSchema.parse(record);
  const configured = (field: string): boolean => {
    const raw = record[field];
    return typeof raw === "string" && raw.length > 0;
  };

  return {
    ...parsed,
    entraIdSecretConfigured: configured("entraIdClientSecret"),
    googleSecretConfigured: configured("googleClientSecret"),
    oidcSecretConfigured: configured("oidcClientSecret"),
  };
}

// Accepts a partial update: stored values are merged over so untouched
// fields (including provider toggles for other providers) survive, and blank
// secret inputs keep the stored secret (persistCategory skips empty secrets).
export async function updateSsoSettings(
  input: Partial<SsoSettings> & {
    entraIdClientSecret?: string;
    googleClientSecret?: string;
    oidcClientSecret?: string;
  },
): Promise<void> {
  const record = await readCategoryRecord("sso");
  const merged = ssoSettingsSchema.parse(record);
  await persistCategory(
    "sso",
    { ...merged, ...input } as unknown as Record<string, unknown>,
    SSO_SECRET_FIELDS,
  );
}

// Decrypts a provider's stored client secret on demand (auth provider build
// time). Returns null when unset or undecryptable — the provider then stays
// disabled rather than failing the whole auth config.
export async function getSsoSecret(
  provider: "entraId" | "google" | "oidc",
): Promise<string | null> {
  const key = SSO_SECRET_KEYS[provider];
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row || typeof row.value !== "string" || row.value.length === 0) {
    return null;
  }
  return safeDecryptSecret(row.value, key);
}

const BREAK_GLASS_KEY = "sso.breakGlassHash";
const BREAK_GLASS_TTL_MS = 24 * 60 * 60 * 1000;

type BreakGlassRecord = {
  hash: string;
  expiresAt: string;
  consumed: boolean;
};

export async function setBreakGlassHash(hash: string): Promise<void> {
  const record: BreakGlassRecord = {
    hash,
    expiresAt: new Date(Date.now() + BREAK_GLASS_TTL_MS).toISOString(),
    consumed: false,
  };
  await prisma.appSetting.upsert({
    where: { key: BREAK_GLASS_KEY },
    update: { value: record, category: "sso" },
    create: { key: BREAK_GLASS_KEY, category: "sso", value: record },
  });
}

// Returns the stored record only while it is unconsumed and unexpired —
// expired/consumed tokens read exactly like "no break glass configured".
export async function getBreakGlassHash(): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({
    where: { key: BREAK_GLASS_KEY },
  });
  if (!row || typeof row.value !== "object" || row.value === null) {
    return null;
  }
  const record = row.value as Partial<BreakGlassRecord>;
  if (record.consumed || typeof record.hash !== "string") {
    return null;
  }
  const expiresAt = Date.parse(record.expiresAt ?? "");
  if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
    return null;
  }
  return record.hash;
}

// Atomically marks the token consumed. Returns true only for the caller that
// actually flipped it, so two concurrent requests can't both "use" one token.
export async function consumeBreakGlassHash(): Promise<boolean> {
  const affected = await prisma.$executeRaw`
    UPDATE app_settings
    SET value = jsonb_set(value, '{consumed}', 'true')
    WHERE key = ${BREAK_GLASS_KEY}
      AND (value->>'consumed')::boolean IS NOT TRUE
  `;
  return affected > 0;
}

// A short-lived grant minted when a valid break-glass token is consumed: it
// lets the credentials callback accept local sign-in for a few minutes even
// in SSO-only mode. Server-side and time-boxed, so it can't be forged by a
// client (unlike a cookie).
const BREAK_GLASS_GRANT_KEY = "sso.breakGlassGrantUntil";
const BREAK_GLASS_GRANT_TTL_MS = 15 * 60 * 1000;

export async function setBreakGlassGrant(): Promise<void> {
  const until = new Date(Date.now() + BREAK_GLASS_GRANT_TTL_MS).toISOString();
  await prisma.appSetting.upsert({
    where: { key: BREAK_GLASS_GRANT_KEY },
    update: { value: until, category: "sso" },
    create: { key: BREAK_GLASS_GRANT_KEY, category: "sso", value: until },
  });
}

export async function getBreakGlassGrant(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({
    where: { key: BREAK_GLASS_GRANT_KEY },
  });
  const raw = row?.value;
  if (typeof raw !== "string") return false;
  const until = Date.parse(raw);
  return !Number.isNaN(until) && until > Date.now();
}

export async function clearBreakGlassGrant(): Promise<void> {
  await prisma.appSetting.deleteMany({ where: { key: BREAK_GLASS_GRANT_KEY } });
}

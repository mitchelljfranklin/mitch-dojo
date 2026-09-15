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

const EMAIL_SECRET_FIELDS: ReadonlySet<string> = new Set(["smtpPassword"]);

export type EmailSettingsView = Omit<EmailSettings, "smtpPassword"> & {
  smtpPasswordConfigured: boolean;
};

export async function getEmailSettings(): Promise<EmailSettingsView> {
  const record = await readCategoryRecord("email");
  const smtpPasswordConfigured =
    typeof record.smtpPassword === "string" && record.smtpPassword.length > 0;
  const parsed = emailSettingsSchema.parse({ ...record, smtpPassword: "" });

  return {
    smtpHost: parsed.smtpHost,
    smtpPort: parsed.smtpPort,
    smtpUser: parsed.smtpUser,
    fromAddress: parsed.fromAddress,
    fromName: parsed.fromName,
    smtpPasswordConfigured,
  };
}

export async function updateEmailSettings(input: EmailSettings): Promise<void> {
  await persistCategory("email", input, EMAIL_SECRET_FIELDS);
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

export async function getEmailSecret(): Promise<string | null> {
  const key = "email.smtpPassword";
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

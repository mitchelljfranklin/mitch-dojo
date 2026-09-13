"use server";

import { randomBytes } from "node:crypto";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import {
  getAppearanceSettings,
  getStorageSettings,
  updateOperationsSettings,
  updateOrganizationSettings,
  updateAppearanceSettings,
  updateStorageSettings,
  updateAuditRetention,
  updateEmailLogRetention,
  updateEmailSettings,
  updateCronSettings,
} from "@/lib/settings";
import {
  organizationSettingsSchema,
  storageSettingsSchema,
} from "@/lib/settings/schema";
import { storage } from "@/lib/storage";
import {
  isDangerousUploadMime,
  validateMagicBytes,
} from "@/lib/upload-validation";

const ALLOWED_LOGO_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

export type SettingsActionState = { ok: boolean; message: string } | undefined;

export async function saveOrganizationSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = organizationSettingsSchema.safeParse({
    name: formData.get("name"),
    supportEmail: formData.get("supportEmail") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await updateOrganizationSettings(parsed.data);
  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "organization",
    );
  return { ok: true, message: "Organization settings saved." };
}

export async function saveAppearanceSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const primaryHex = (formData.get("primaryHex") as string) || "";
  const secondaryHex = (formData.get("secondaryHex") as string) || "";
  const borderRadius = parseInt(
    (formData.get("borderRadius") as string) || "10",
    10,
  );
  const pageWidth = (formData.get("pageWidth") as string) || "constrained";

  if (primaryHex && !/^#[0-9a-fA-F]{6}$/.test(primaryHex)) {
    return {
      ok: false,
      message: "Primary color must be a valid hex color (e.g. #3b82f6).",
    };
  }
  if (secondaryHex && !/^#[0-9a-fA-F]{6}$/.test(secondaryHex)) {
    return {
      ok: false,
      message: "Secondary color must be a valid hex color (e.g. #f59e0b).",
    };
  }

  const previousLogoKey = (await getAppearanceSettings()).logoKey;
  let logoKey = previousLogoKey;
  const logoFile = formData.get("logoFile") as File | null;
  const removeLogo = formData.get("removeLogo") === "true";

  if (removeLogo) {
    logoKey = "";
  } else if (logoFile && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) {
      return { ok: false, message: "Logo must be under 2 MB." };
    }
    if (
      !logoFile.type.startsWith("image/") ||
      isDangerousUploadMime(logoFile.type)
    ) {
      return { ok: false, message: "Logo must be an image file." };
    }

    // The declared MIME type is client-controlled, so the extension
    // allowlist and magic bytes are the real gate. SVG is excluded outright:
    // it is scriptable and is served inline from this origin.
    const ext = logoFile.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_LOGO_EXTENSIONS.has(ext)) {
      return {
        ok: false,
        message: "Logo must be a PNG, JPG, GIF, or WEBP image.",
      };
    }
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    if (!validateMagicBytes(ext, buffer)) {
      return {
        ok: false,
        message: "Logo file content does not match its extension.",
      };
    }

    const fileName = `logo-${randomBytes(8).toString("hex")}.${ext}`;
    await storage.save(fileName, buffer);
    logoKey = fileName;
  }

  await updateAppearanceSettings({
    primaryHex: primaryHex || "",
    secondaryHex: secondaryHex || "",
    logoKey,
    borderRadius:
      isNaN(borderRadius) || borderRadius < 0 || borderRadius > 16
        ? 10
        : borderRadius,
    pageWidth:
      pageWidth === "constrained" || pageWidth === "full"
        ? pageWidth
        : "constrained",
  });

  if (previousLogoKey && previousLogoKey !== logoKey) {
    try {
      await storage.delete(previousLogoKey);
    } catch {
      // Best-effort; orphan-sweep cron cleans any leftovers.
    }
  }

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "appearance",
    );
  return { ok: true, message: "Appearance settings saved." };
}

export async function saveOperationsSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsePositiveInt = (
    value: FormDataEntryValue | null,
    fallback: number,
  ) => {
    const parsed = parseInt(String(value ?? ""), 10);
    return Number.isNaN(parsed) || parsed < 0 ? fallback : parsed;
  };

  const loginRateLimitPerMin = parsePositiveInt(
    formData.get("loginRateLimit"),
    10,
  );
  const sessionTimeoutMinutes = parsePositiveInt(
    formData.get("sessionTimeoutMinutes"),
    30,
  );
  const passwordResetPerMin = parsePositiveInt(
    formData.get("passwordResetPerMin"),
    1,
  );
  const auditRetentionDays = parsePositiveInt(
    formData.get("auditRetention"),
    0,
  );
  const emailLogRetentionDays = parsePositiveInt(
    formData.get("emailLogRetention"),
    14,
  );
  const internalSchedulerEnabled =
    formData.get("internalSchedulerEnabled") === "on";

  await updateOperationsSettings({
    loginRateLimitPerMin: Math.max(1, loginRateLimitPerMin),
    sessionTimeoutMinutes,
    passwordResetPerMin: Math.max(1, passwordResetPerMin),
  });
  await updateAuditRetention(auditRetentionDays);
  await updateEmailLogRetention(emailLogRetentionDays);
  await updateCronSettings({ internalSchedulerEnabled });

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "operations",
    );
  return { ok: true, message: "Operations settings saved." };
}

export async function saveEmailSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const { emailSettingsSchema } = await import("@/lib/settings/schema");
  const parsed = emailSettingsSchema.safeParse({
    smtpHost: formData.get("smtpHost") ?? "",
    smtpPort: formData.get("smtpPort") ?? 587,
    smtpUser: formData.get("smtpUser") ?? "",
    fromAddress: formData.get("fromAddress") ?? "",
    fromName: formData.get("fromName") ?? "",
    smtpPassword: formData.get("smtpPassword") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await updateEmailSettings(parsed.data);
  const user = await getCurrentUser();
  if (user)
    await logAudit(user.id, AUDIT_ACTIONS.UPDATE_SETTINGS, "Setting", "email");
  return { ok: true, message: "Email settings saved." };
}

export async function sendSmtpTestAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const recipientRaw = (formData.get("recipient") as string)?.trim() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientRaw)) {
    return { ok: false, message: "Enter a valid recipient email address." };
  }

  const { getEmailSettings } = await import("@/lib/settings");
  const { smtpHost } = await getEmailSettings();
  if (!smtpHost) {
    return {
      ok: false,
      message: "Save your SMTP settings before sending a test email.",
    };
  }

  const { sendTestEmail } = await import("@/lib/email/mailer");
  const user = await getCurrentUser();
  const result = await sendTestEmail(recipientRaw, user?.id);

  if (result.ok) {
    if (user)
      await logAudit(
        user.id,
        AUDIT_ACTIONS.UPDATE_SETTINGS,
        "Setting",
        "email.test",
      );
    return { ok: true, message: `Test email sent to ${recipientRaw}.` };
  }

  return { ok: false, message: result.message };
}

export async function saveStorageSettings(
  _previousState: { ok: boolean; message: string } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const existing = await getStorageSettings();
  const raw: Record<string, string> = {
    provider: String(formData.get("provider") ?? "local"),
    s3Bucket: String(formData.get("s3Bucket") ?? ""),
    s3Region: String(formData.get("s3Region") ?? ""),
    s3AccessKeyId: String(formData.get("s3AccessKeyId") ?? ""),
    s3SecretAccessKey: String(formData.get("s3SecretAccessKey") ?? ""),
    azureConnectionString: String(formData.get("azureConnectionString") ?? ""),
    azureContainerName: String(formData.get("azureContainerName") ?? ""),
  };

  if (raw.s3SecretAccessKey === "" && existing) {
    raw.s3SecretAccessKey =
      (existing as unknown as Record<string, string>).s3SecretAccessKey ?? "";
  }
  if (raw.azureConnectionString === "" && existing) {
    raw.azureConnectionString =
      (existing as unknown as Record<string, string>).azureConnectionString ??
      "";
  }

  const parsed = storageSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await updateStorageSettings(parsed.data);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Settings",
      "storage",
    );
  }

  return { ok: true, message: "Storage settings saved." };
}

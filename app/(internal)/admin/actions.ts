"use server";

import { randomBytes } from "node:crypto";

import { env } from "@/lib/env";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import {
  generateBreakGlassToken,
  hashBreakGlassToken,
} from "@/lib/break-glass";
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
  updateMembershipsSettings,
  updateCommunicationsSettings,
  updateEmailTemplateFields,
  updateSsoSettings,
  setBreakGlassHash,
} from "@/lib/settings";
import {
  organizationSettingsSchema,
  storageSettingsSchema,
  membershipsSettingsSchema,
  communicationsSettingsSchema,
} from "@/lib/settings/schema";
import { storage } from "@/lib/storage";
import {
  isDangerousUploadMime,
  validateMagicBytes,
} from "@/lib/upload-validation";

const ALLOWED_LOGO_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

// Shared logo-upload gate: size limit, image MIME, extension allowlist,
// magic bytes. Returns the storage key, or an error message for the form.
async function storeLogoUpload(
  file: File,
): Promise<{ key: string } | { error: string }> {
  if (file.size > 2 * 1024 * 1024) {
    return { error: "Logo must be under 2 MB." };
  }
  if (!file.type.startsWith("image/") || isDangerousUploadMime(file.type)) {
    return { error: "Logo must be an image file." };
  }
  // The declared MIME type is client-controlled, so the extension
  // allowlist and magic bytes are the real gate. SVG is excluded outright:
  // it is scriptable and is served inline from this origin.
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_LOGO_EXTENSIONS.has(ext)) {
    return { error: "Logo must be a PNG, JPG, GIF, or WEBP image." };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(ext, buffer)) {
    return { error: "Logo file content does not match its extension." };
  }
  const fileName = `logo-${randomBytes(8).toString("hex")}.${ext}`;
  await storage.save(fileName, buffer);
  return { key: fileName };
}

export type SettingsActionState = { ok: boolean; message: string } | undefined;

export async function saveOrganizationSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = organizationSettingsSchema.safeParse({
    name: formData.get("name"),
    supportEmail: formData.get("supportEmail") ?? "",
    defaultCountry: String(formData.get("defaultCountry") ?? "").toUpperCase(),
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

  const appearance = await getAppearanceSettings();
  const previousLogoKey = appearance.logoKey;
  const previousLogoDarkKey = appearance.logoDarkKey;
  let logoKey = previousLogoKey;
  let logoDarkKey = previousLogoDarkKey;
  const logoFile = formData.get("logoFile") as File | null;
  const logoDarkFile = formData.get("logoDarkFile") as File | null;
  const removeLogo = formData.get("removeLogo") === "true";
  const removeLogoDark = formData.get("removeLogoDark") === "true";

  if (removeLogo) {
    logoKey = "";
  } else if (logoFile && logoFile.size > 0) {
    const stored = await storeLogoUpload(logoFile);
    if ("error" in stored) {
      return { ok: false, message: stored.error };
    }
    logoKey = stored.key;
  }

  if (removeLogoDark) {
    logoDarkKey = "";
  } else if (logoDarkFile && logoDarkFile.size > 0) {
    const stored = await storeLogoUpload(logoDarkFile);
    if ("error" in stored) {
      return { ok: false, message: stored.error };
    }
    logoDarkKey = stored.key;
  }

  const emailLogoVariantRaw = String(formData.get("emailLogoVariant") ?? "");
  // "dark" only sticks when a dark logo exists (upload or already stored) —
  // otherwise the mailer would fall back to the primary pair anyway.
  const emailLogoVariant =
    emailLogoVariantRaw === "dark" && logoDarkKey ? "dark" : "primary";

  const bookingHeadline = String(formData.get("bookingHeadline") ?? "").trim();
  const bookingDescription = String(
    formData.get("bookingDescription") ?? "",
  ).trim();

  await updateAppearanceSettings({
    primaryHex: primaryHex || "",
    secondaryHex: secondaryHex || "",
    logoKey,
    logoDarkKey,
    emailLogoVariant,
    borderRadius:
      isNaN(borderRadius) || borderRadius < 0 || borderRadius > 16
        ? 10
        : borderRadius,
    pageWidth:
      pageWidth === "constrained" || pageWidth === "full"
        ? pageWidth
        : "constrained",
    bookingHeadline:
      bookingHeadline.length > 0
        ? bookingHeadline.slice(0, 120)
        : "Book a free trial class",
    bookingDescription: bookingDescription.slice(0, 300),
  });

  // Old files are removed only after the settings write succeeds, so a
  // failure mid-save never orphans the still-referenced logos (the sweep is
  // the backstop either way).
  for (const [previous, current] of [
    [previousLogoKey, logoKey],
    [previousLogoDarkKey, logoDarkKey],
  ] as const) {
    if (previous && previous !== current) {
      try {
        await storage.delete(previous);
      } catch {
        // Best-effort; orphan-sweep cron cleans any leftovers.
      }
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

// The former grab-bag saveOperationsSettings action, split four ways so each
// admin page owns exactly one save. All four write the same operations /
// cron settings keys as before — no schema change, only focused edits.

export async function saveSignInSecuritySettings(
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
  const breakGlassPerMin = parsePositiveInt(
    formData.get("breakGlassPerMin"),
    10,
  );

  await updateOperationsSettings({
    loginRateLimitPerMin: Math.max(1, loginRateLimitPerMin),
    sessionTimeoutMinutes,
    passwordResetPerMin: Math.max(1, passwordResetPerMin),
    breakGlassPerMin: Math.max(1, breakGlassPerMin),
  });

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "sign-in",
    );
  return { ok: true, message: "Sign-in security saved." };
}

export async function saveAuditRetentionSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = parseInt(String(formData.get("auditRetention") ?? ""), 10);
  const auditRetentionDays = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;

  await updateAuditRetention(auditRetentionDays);

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "audit-retention",
    );
  return { ok: true, message: "Audit retention saved." };
}

export async function saveEmailLogRetentionSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = parseInt(String(formData.get("emailLogRetention") ?? ""), 10);
  const emailLogRetentionDays =
    Number.isNaN(parsed) || parsed < 0 ? 14 : parsed;

  await updateEmailLogRetention(emailLogRetentionDays);

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "email-log-retention",
    );
  return { ok: true, message: "Email log retention saved." };
}

export async function saveSchedulingSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const internalSchedulerEnabled =
    formData.get("internalSchedulerEnabled") === "on";

  await updateCronSettings({ internalSchedulerEnabled });

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "scheduling",
    );
  return { ok: true, message: "Scheduling settings saved." };
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

export async function saveMembershipsSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = membershipsSettingsSchema.safeParse({
    currency: formData.get("currency") ?? "USD",
    invoiceDueDays: formData.get("invoiceDueDays") ?? 14,
    suspendAfterOverdueDays: formData.get("suspendAfterOverdueDays") ?? 30,
    autoGenerateInvoices: formData.get("autoGenerateInvoices") === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await updateMembershipsSettings(parsed.data);
  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "memberships",
    );
  return { ok: true, message: "Membership settings saved." };
}

export async function saveCommunicationsSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = communicationsSettingsSchema.safeParse({
    classRemindersEnabled: formData.get("classRemindersEnabled") === "on",
    classReminderHoursBefore: formData.get("classReminderHoursBefore") ?? 24,
    paymentRemindersEnabled: formData.get("paymentRemindersEnabled") === "on",
    paymentReminderDaysBeforeDue:
      formData.get("paymentReminderDaysBeforeDue") ?? 3,
    paymentReminderOverdueDays: formData.get("paymentReminderOverdueDays") ?? 7,
    birthdayEmailsEnabled: formData.get("birthdayEmailsEnabled") === "on",
    trialFollowUpsEnabled: formData.get("trialFollowUpsEnabled") === "on",
    trialFollowUpDaysAfterJoin: formData.get("trialFollowUpDaysAfterJoin") ?? 3,
    bookingConfirmationsEnabled:
      formData.get("bookingConfirmationsEnabled") === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await updateCommunicationsSettings(parsed.data);

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "communications",
    );
  return { ok: true, message: "Communication settings saved." };
}

export async function saveEmailTemplatesAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  await updateEmailTemplateFields({
    classReminderSubject: String(formData.get("classReminderSubject") ?? ""),
    classReminderBody: String(formData.get("classReminderBody") ?? ""),
    paymentReminderSubject: String(
      formData.get("paymentReminderSubject") ?? "",
    ),
    paymentReminderBody: String(formData.get("paymentReminderBody") ?? ""),
    birthdaySubject: String(formData.get("birthdaySubject") ?? ""),
    birthdayBody: String(formData.get("birthdayBody") ?? ""),
    bookingSubject: String(formData.get("bookingSubject") ?? ""),
    bookingBody: String(formData.get("bookingBody") ?? ""),
    trialFollowUpSubject: String(formData.get("trialFollowUpSubject") ?? ""),
    trialFollowUpBody: String(formData.get("trialFollowUpBody") ?? ""),
  });

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "email-templates",
    );
  return { ok: true, message: "Email templates saved." };
}

// Sends one sample email through the real SMTP transport so the admin can
// verify templates render correctly before enabling reminders.
export async function sendCommunicationSampleAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const recipientRaw = String(formData.get("recipient") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientRaw)) {
    return { ok: false, message: "Enter a valid recipient email address." };
  }

  const { sendEmail } = await import("@/lib/email/mailer");
  const result = await sendEmail(recipientRaw, "classReminder", {
    studentName: "Sample Student",
    className: "Sample Class",
    classTime: "Tomorrow at 18:00",
    appName: String(formData.get("appName") ?? "mitch-dojo"),
  });

  if (result.ok) {
    const user = await getCurrentUser();
    if (user)
      await logAudit(
        user.id,
        AUDIT_ACTIONS.UPDATE_SETTINGS,
        "Setting",
        "communications.sample",
      );
    return { ok: true, message: "Sample reminder sent." };
  }
  return {
    ok: false,
    message:
      "Send failed — check the email log. Most common cause: SMTP not configured.",
  };
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

export async function saveSsoSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const roleIdRaw = String(formData.get("autoProvisionRoleId") ?? "").trim();
  const update = {
    entraIdEnabled: formData.get("entraIdEnabled") === "on",
    entraIdClientId: String(formData.get("entraIdClientId") ?? "").trim(),
    entraIdClientSecret: String(formData.get("entraIdClientSecret") ?? ""),
    googleEnabled: formData.get("googleEnabled") === "on",
    googleClientId: String(formData.get("googleClientId") ?? "").trim(),
    googleClientSecret: String(formData.get("googleClientSecret") ?? ""),
    oidcEnabled: formData.get("oidcEnabled") === "on",
    oidcName: String(formData.get("oidcName") ?? "").trim(),
    oidcIssuer: String(formData.get("oidcIssuer") ?? "").trim(),
    oidcClientId: String(formData.get("oidcClientId") ?? "").trim(),
    oidcClientSecret: String(formData.get("oidcClientSecret") ?? ""),
    autoProvisionRoleId: roleIdRaw,
    allowedDomain: String(formData.get("allowedDomain") ?? "")
      .trim()
      .replace(/^@/, "")
      .toLowerCase(),
    disableLocalAuth: formData.get("disableLocalAuth") === "on",
  };

  // Anti-lock-out guard: refusing to save SSO-only mode with zero fully
  // configured providers (the login page would ignore the flag, but the
  // setting should never silently diverge from reality).
  const anyProviderReady =
    (update.entraIdEnabled && update.entraIdClientId) ||
    (update.googleEnabled && update.googleClientId) ||
    (update.oidcEnabled && update.oidcIssuer && update.oidcClientId);
  if (update.disableLocalAuth && !anyProviderReady) {
    return {
      ok: false,
      message:
        "Enable at least one SSO provider (with client ID and secret) before disabling local sign-in.",
    };
  }

  await updateSsoSettings(update);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.UPDATE_SETTINGS, "Setting", "sso");
  }

  return { ok: true, message: "SSO settings saved." };
}

export type BreakGlassUrlState =
  { ok: true; url: string } | { ok: false; message: string } | undefined;

// Generates a fresh break-glass sign-in URL. Regenerating revokes the
// previous token (single stored hash); the URL is returned exactly once —
// only its bcrypt hash is persisted.
export async function generateBreakGlassUrlAction(
  _previousState: BreakGlassUrlState,
  _formData: FormData,
): Promise<BreakGlassUrlState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const token = generateBreakGlassToken();
  await setBreakGlassHash(await hashBreakGlassToken(token));

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "sso.breakGlass",
    );
  }

  return { ok: true, url: `${env.APP_URL}/login?breakGlass=${token}` };
}

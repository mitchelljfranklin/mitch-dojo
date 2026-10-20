"use server";

import { signOut } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import {
  createPasswordResetToken,
  consumeResetToken,
  findUserByEmail,
  hasLocalPassword,
  resetUserPassword,
} from "@/lib/db/users";
import { sendEmail } from "@/lib/email/mailer";
import { env } from "@/lib/env";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { rateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/schemas/auth";
import { getOperationsSettings, getOrganizationSettings } from "@/lib/settings";
import { redirect } from "next/navigation";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export type ForgotPasswordState = { ok: boolean; message: string } | undefined;

export async function sendResetEmailAction(
  previousState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const translate = await getTranslations("Auth.forgot");
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: translate("invalidEmail"),
    };
  }

  const { email } = parsed.data;

  const { passwordResetPerMin } = await getOperationsSettings();
  if (!rateLimit("resetPassword", email.toLowerCase(), passwordResetPerMin)) {
    return {
      ok: true,
      message: translate("rateLimited"),
    };
  }

  const user = await findUserByEmail(email);
  if (!user || !hasLocalPassword(user.passwordHash)) {
    // Silent — don't leak account existence or whether it is SSO-managed.
    // SSO-only accounts have no local password to reset; that is the IdP's role.
    return {
      ok: true,
      message: translate("sent"),
    };
  }

  const token = await createPasswordResetToken(user.id);
  const org = await getOrganizationSettings();
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;

  await sendEmail(email, "reset", {
    appName: org.name,
    resetUrl,
    expiresIn: "1 hour",
  });

  return {
    ok: true,
    message: translate("sent"),
  };
}

export type ResetPasswordState = { ok: boolean; message: string } | undefined;

export async function resetPasswordAction(
  previousState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const translate = await getTranslations("Auth.reset");
  const token = formData.get("token") as string;
  if (!token) {
    return { ok: false, message: translate("invalidLink") };
  }

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: translate("invalidPassword"),
    };
  }

  const userId = await consumeResetToken(token);
  if (!userId) {
    return { ok: false, message: translate("expiredToken") };
  }

  await resetUserPassword(userId, parsed.data.password);
  await logAudit(userId, AUDIT_ACTIONS.RESET_PASSWORD, "User", userId, {
    selfService: true,
  });
  redirect("/login?reset=1");
}

"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { getTranslations } from "next-intl/server";

import { signIn } from "@/lib/auth";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { getOperationsSettings, getSsoSettings } from "@/lib/settings";

export type LoginState = { error: string } | undefined;

export async function authenticate(
  previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const headersList = await headers();
  const ip = getClientIp(headersList);

  const settings = await getOperationsSettings();
  const rateLimitPerMin = settings.loginRateLimitPerMin ?? 10;
  const translate = await getTranslations("Auth.login");

  if (!rateLimit("login", ip, rateLimitPerMin)) {
    return { error: translate("tooMany") };
  }

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: translate("invalid") };
    }
    throw error;
  }
}

const SSO_ACTION_PROVIDER_IDS = ["microsoft-entra-id", "google", "oidc"];

// Starts an SSO sign-in. The provider is re-validated against the current
// settings so a forged form can't target an arbitrary provider id.
export async function ssoSignInAction(formData: FormData): Promise<void> {
  const providerId = String(formData.get("provider") ?? "");
  if (!SSO_ACTION_PROVIDER_IDS.includes(providerId)) {
    return;
  }

  const settings = await getSsoSettings();
  const enabled = [
    settings.entraIdEnabled && settings.entraIdClientId
      ? "microsoft-entra-id"
      : null,
    settings.googleEnabled && settings.googleClientId ? "google" : null,
    settings.oidcEnabled && settings.oidcIssuer && settings.oidcClientId
      ? "oidc"
      : null,
  ].filter((id): id is string => id !== null);

  if (!enabled.includes(providerId)) {
    return;
  }

  await signIn(providerId, { redirectTo: "/dashboard" });
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getClientIp } from "@/lib/client-ip";
import { countUsers } from "@/lib/db/users";
import { rateLimit } from "@/lib/rate-limit";
import {
  getOperationsSettings,
  getOrganizationSettings,
  getSsoSettings,
} from "@/lib/settings";
import {
  verifyBreakGlassToken,
  shouldShowLocalAuth,
  countConfiguredSsoProviders,
} from "@/lib/break-glass";
import {
  consumeBreakGlassHash,
  getBreakGlassHash,
  setBreakGlassGrant,
} from "@/lib/settings";

import { LoginForm } from "./login-form";
import { SsoButtons, type SsoButton } from "./sso-buttons";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Auth");
  return { title: translate("login.title") };
}

type LoginPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

// Enabled providers as the login page should render them — mirrors
// buildSsoProviders() conditions (enabled + client id + stored secret) so a
// half-configured provider never shows a button that would dead-end.
async function enabledSsoButtons(): Promise<SsoButton[]> {
  const settings = await getSsoSettings();
  const buttons: SsoButton[] = [];

  if (
    settings.entraIdEnabled &&
    settings.entraIdClientId &&
    settings.entraIdSecretConfigured
  ) {
    buttons.push({ id: "microsoft-entra-id", label: "Microsoft" });
  }
  if (
    settings.googleEnabled &&
    settings.googleClientId &&
    settings.googleSecretConfigured
  ) {
    buttons.push({ id: "google", label: "Google" });
  }
  if (
    settings.oidcEnabled &&
    settings.oidcIssuer &&
    settings.oidcClientId &&
    settings.oidcSecretConfigured
  ) {
    buttons.push({ id: "oidc", label: settings.oidcName || "SSO" });
  }

  return buttons;
}

// Verifies a break-glass token (when present) against the stored hash.
// Success consumes the token server-side — single use, 24h expiry enforced
// by the accessor. Rate-limited per IP like every other public auth surface.
async function verifyBreakGlassParam(
  token: string | undefined,
): Promise<boolean> {
  if (!token) {
    return false;
  }
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const { breakGlassPerMin } = await getOperationsSettings();
  if (!rateLimit("break-glass", ip, breakGlassPerMin)) {
    return false;
  }

  const storedHash = await getBreakGlassHash();
  if (!storedHash) {
    return false;
  }
  const valid = await verifyBreakGlassToken(token, storedHash);
  if (!valid) {
    return false;
  }
  // Atomic consume: only the request that actually flips the flag proceeds,
  // so a scanner/prefetch racing a real use can't both win.
  const consumed = await consumeBreakGlassHash();
  if (!consumed) {
    return false;
  }
  // Mint a short-lived grant so the credentials callback accepts the local
  // sign-in this token just unlocked (SSO-only mode otherwise rejects it).
  await setBreakGlassGrant();
  return true;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if ((await countUsers()) === 0) {
    redirect("/setup");
  }
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const organization = await getOrganizationSettings();
  const ssoSettings = await getSsoSettings();
  const ssoButtons = await enabledSsoButtons();
  const translate = await getTranslations("Auth.login");

  const breakGlassValid = await verifyBreakGlassParam(query.breakGlass);
  const showLocalAuth = shouldShowLocalAuth({
    disableLocalAuth: ssoSettings.disableLocalAuth,
    ssoProviderCount: countConfiguredSsoProviders(ssoSettings),
    breakGlassValid,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{organization.name}</CardTitle>
        <CardDescription>{translate("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.error ? (
          <p className="text-destructive text-sm" role="alert">
            {translate("denied")}
          </p>
        ) : null}

        {ssoButtons.length > 0 ? <SsoButtons providers={ssoButtons} /> : null}

        {showLocalAuth ? (
          <>
            {ssoButtons.length > 0 ? (
              <p className="text-muted-foreground text-center text-xs">
                {translate("orEmail")}
              </p>
            ) : null}
            <LoginForm />
            <a
              href="/forgot-password"
              className="hover:text-primary text-muted-foreground text-center text-xs hover:underline"
            >
              {translate("forgot")}
            </a>
          </>
        ) : null}

        {ssoButtons.length > 0 && !showLocalAuth ? (
          <p className="text-muted-foreground text-center text-xs">
            {translate("ssoOnly")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

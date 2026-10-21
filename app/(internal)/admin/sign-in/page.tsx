import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listRoles } from "@/lib/db/roles";
import { getOperationsSettings, getSsoSettings } from "@/lib/settings";

import { SignInSecurityForm } from "../sign-in-security-form";
import { SsoForm } from "../sso-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.signIn");
  return { title: translate("metaTitle") };
}

export default async function AdminSignInPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translate = await getTranslations("Admin.signIn");
  const operations = await getOperationsSettings();
  const sso = await getSsoSettings();
  const roles = await listRoles();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translate("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{translate("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translate("ssoTitle")}</CardTitle>
          <CardDescription>{translate("ssoDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SsoForm
            entraIdEnabled={sso.entraIdEnabled}
            entraIdClientId={sso.entraIdClientId}
            entraIdSecretConfigured={sso.entraIdSecretConfigured}
            googleEnabled={sso.googleEnabled}
            googleClientId={sso.googleClientId}
            googleSecretConfigured={sso.googleSecretConfigured}
            oidcEnabled={sso.oidcEnabled}
            oidcName={sso.oidcName}
            oidcIssuer={sso.oidcIssuer}
            oidcClientId={sso.oidcClientId}
            oidcSecretConfigured={sso.oidcSecretConfigured}
            autoProvisionRoleId={sso.autoProvisionRoleId}
            roles={roles.map((role) => ({ id: role.id, name: role.name }))}
            allowedDomain={sso.allowedDomain}
            disableLocalAuth={sso.disableLocalAuth}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{translate("sessionsTitle")}</CardTitle>
          <CardDescription>{translate("sessionsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInSecurityForm
            loginRateLimitPerMin={operations.loginRateLimitPerMin}
            sessionTimeoutMinutes={operations.sessionTimeoutMinutes}
            passwordResetPerMin={operations.passwordResetPerMin}
            breakGlassPerMin={operations.breakGlassPerMin}
          />
        </CardContent>
      </Card>
    </div>
  );
}

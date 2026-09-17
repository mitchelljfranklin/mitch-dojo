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

export const metadata = { title: "Admin — Sign-in & SSO" };

export default async function AdminSignInPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const operations = await getOperationsSettings();
  const sso = await getSsoSettings();
  const roles = await listRoles();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign-in & SSO</h1>
        <p className="text-muted-foreground text-sm">
          How staff authenticate — identity providers, single sign-on, and
          session security.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Single sign-on</CardTitle>
          <CardDescription>
            Sign in through Microsoft, Google, or any OpenID Connect provider.
            First-time SSO sign-ins can be provisioned automatically.
          </CardDescription>
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
          <CardTitle>Sessions & rate limits</CardTitle>
          <CardDescription>
            Sign-in throttling and automatic logout for idle sessions.
          </CardDescription>
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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getOperationsSettings } from "@/lib/settings";

import { SignInSecurityForm } from "../sign-in-security-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Sign-in" };

export default async function AdminSignInPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const operations = await getOperationsSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign-in</h1>
        <p className="text-muted-foreground text-sm">
          How staff authenticate, and how long they stay signed in.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Sign-in throttling and automatic logout for idle sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInSecurityForm
            loginRateLimitPerMin={operations.loginRateLimitPerMin}
            sessionTimeoutMinutes={operations.sessionTimeoutMinutes}
            passwordResetPerMin={operations.passwordResetPerMin}
          />
        </CardContent>
      </Card>
    </div>
  );
}

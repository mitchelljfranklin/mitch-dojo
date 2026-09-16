import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getEmailSettings } from "@/lib/settings";

import { EmailForm } from "../email-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Email" };

export default async function AdminEmailPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const email = await getEmailSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email</h1>
        <p className="text-muted-foreground text-sm">
          SMTP delivery for reminders, portal links, and password resets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SMTP</CardTitle>
          <CardDescription>
            The password is encrypted at rest. Test the connection after saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailForm
            smtpHost={email.smtpHost}
            smtpPort={email.smtpPort}
            smtpUser={email.smtpUser}
            fromAddress={email.fromAddress}
            fromName={email.fromName}
            smtpPasswordConfigured={email.smtpPasswordConfigured}
          />
        </CardContent>
      </Card>
    </div>
  );
}

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getEmailTemplateSettings } from "@/lib/settings";

import { EmailTemplatesForm } from "../email-templates-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Templates" };

export default async function AdminTemplatesPage() {
  await requirePermission(PERMISSIONS.COMMUNICATIONS_EDIT);
  const emailTemplates = await getEmailTemplateSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="text-muted-foreground text-sm">
          Subject and body copy for every automated email.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email templates</CardTitle>
          <CardDescription>
            Placeholders in double braces resolve at send time. The logo and
            sender identity come from Appearance and Email settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailTemplatesForm
            templates={{
              classReminderSubject: emailTemplates.classReminderSubject,
              classReminderBody: emailTemplates.classReminderBody,
              paymentReminderSubject: emailTemplates.paymentReminderSubject,
              paymentReminderBody: emailTemplates.paymentReminderBody,
              birthdaySubject: emailTemplates.birthdaySubject,
              birthdayBody: emailTemplates.birthdayBody,
              bookingSubject: emailTemplates.bookingSubject,
              bookingBody: emailTemplates.bookingBody,
              bookingStaffSubject: emailTemplates.bookingStaffSubject,
              bookingStaffBody: emailTemplates.bookingStaffBody,
              trialFollowUpSubject: emailTemplates.trialFollowUpSubject,
              trialFollowUpBody: emailTemplates.trialFollowUpBody,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

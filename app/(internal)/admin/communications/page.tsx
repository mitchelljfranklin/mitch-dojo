import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getCommunicationsSettings,
  getEmailTemplateSettings,
} from "@/lib/settings";

import { CommunicationsForm } from "../communications-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Communication" };

export default async function AdminCommunicationsPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const [communicationsSettings, emailTemplates] = await Promise.all([
    getCommunicationsSettings(),
    getEmailTemplateSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Communication</h1>
        <p className="text-muted-foreground text-sm">
          Automated reminders and their email templates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Communication</CardTitle>
          <CardDescription>
            Emails go to the student, falling back to their guardian; each
            reminder is sent at most once. Requires SMTP to be configured.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommunicationsForm
            classRemindersEnabled={communicationsSettings.classRemindersEnabled}
            classReminderHoursBefore={
              communicationsSettings.classReminderHoursBefore
            }
            paymentRemindersEnabled={
              communicationsSettings.paymentRemindersEnabled
            }
            paymentReminderDaysBeforeDue={
              communicationsSettings.paymentReminderDaysBeforeDue
            }
            paymentReminderOverdueDays={
              communicationsSettings.paymentReminderOverdueDays
            }
            birthdayEmailsEnabled={communicationsSettings.birthdayEmailsEnabled}
            trialFollowUpsEnabled={communicationsSettings.trialFollowUpsEnabled}
            trialFollowUpDaysAfterJoin={
              communicationsSettings.trialFollowUpDaysAfterJoin
            }
            templates={{
              classReminderSubject: emailTemplates.classReminderSubject,
              classReminderBody: emailTemplates.classReminderBody,
              paymentReminderSubject: emailTemplates.paymentReminderSubject,
              paymentReminderBody: emailTemplates.paymentReminderBody,
              birthdaySubject: emailTemplates.birthdaySubject,
              birthdayBody: emailTemplates.birthdayBody,
              trialFollowUpSubject: emailTemplates.trialFollowUpSubject,
              trialFollowUpBody: emailTemplates.trialFollowUpBody,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

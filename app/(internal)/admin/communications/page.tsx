import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCommunicationsSettings } from "@/lib/settings";

import { CommunicationsForm } from "../communications-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Communication" };

export default async function AdminCommunicationsPage() {
  await requirePermission(PERMISSIONS.COMMUNICATIONS_EDIT);
  const communicationsSettings = await getCommunicationsSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Communication</h1>
        <p className="text-muted-foreground text-sm">
          Automated reminder timing and toggles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reminders</CardTitle>
          <CardDescription>
            Emails go to the student, falling back to their guardian; each
            reminder is sent at most once. Template copy lives under the
            Templates section; requires SMTP to be configured.
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
            bookingConfirmationsEnabled={
              communicationsSettings.bookingConfirmationsEnabled
            }
            bookingStaffAlertsEnabled={
              communicationsSettings.bookingStaffAlertsEnabled
            }
            bookingStaffAlertRecipients={
              communicationsSettings.bookingStaffAlertRecipients
            }
            agreementRemindersEnabled={
              communicationsSettings.agreementRemindersEnabled
            }
            verificationRemindersEnabled={
              communicationsSettings.verificationRemindersEnabled
            }
            verificationReminderDaysBefore={
              communicationsSettings.verificationReminderDaysBefore
            }
            verificationReminderRecipients={
              communicationsSettings.verificationReminderRecipients
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

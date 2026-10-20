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
import { getCommunicationsSettings } from "@/lib/settings";

import { CommunicationsForm } from "../communications-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.communications");
  return { title: translate("metaTitle") };
}

export default async function AdminCommunicationsPage() {
  await requirePermission(PERMISSIONS.COMMUNICATIONS_EDIT);
  const translate = await getTranslations("Admin.communications");
  const communicationsSettings = await getCommunicationsSettings();

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
          <CardTitle>{translate("cardTitle")}</CardTitle>
          <CardDescription>{translate("cardDescription")}</CardDescription>
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

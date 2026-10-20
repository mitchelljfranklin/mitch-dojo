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
import { getEmailTemplateSettings } from "@/lib/settings";

import { EmailTemplatesForm } from "../email-templates-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.templates");
  return { title: translate("metaTitle") };
}

export default async function AdminTemplatesPage() {
  await requirePermission(PERMISSIONS.COMMUNICATIONS_EDIT);
  const translate = await getTranslations("Admin.templates");
  const emailTemplates = await getEmailTemplateSettings();

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
              gradingInviteSubject: emailTemplates.gradingInviteSubject,
              gradingInviteBody: emailTemplates.gradingInviteBody,
              trialFollowUpSubject: emailTemplates.trialFollowUpSubject,
              trialFollowUpBody: emailTemplates.trialFollowUpBody,
              agreementReminderSubject: emailTemplates.agreementReminderSubject,
              agreementReminderBody: emailTemplates.agreementReminderBody,
              verificationReminderSubject:
                emailTemplates.verificationReminderSubject,
              verificationReminderBody: emailTemplates.verificationReminderBody,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  saveEmailTemplatesAction,
  sendCommunicationSampleAction,
} from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type EmailTemplatesFormProps = {
  templates: {
    classReminderSubject: string;
    classReminderBody: string;
    paymentReminderSubject: string;
    paymentReminderBody: string;
    birthdaySubject: string;
    birthdayBody: string;
    bookingSubject: string;
    bookingBody: string;
    bookingStaffSubject: string;
    bookingStaffBody: string;
    gradingInviteSubject: string;
    gradingInviteBody: string;
    trialFollowUpSubject: string;
    trialFollowUpBody: string;
    agreementReminderSubject: string;
    agreementReminderBody: string;
    verificationReminderSubject: string;
    verificationReminderBody: string;
  };
};

type SettingsActionState = { ok: boolean; message: string } | undefined;

export function EmailTemplatesForm(props: EmailTemplatesFormProps) {
  const fingerprint = JSON.stringify(props);
  return <EmailTemplatesFormInner key={fingerprint} {...props} />;
}

function EmailTemplatesFormInner({ templates }: EmailTemplatesFormProps) {
  const translate = useTranslations("Admin.templates");
  const [state, formAction, isPending] = useActionState<
    SettingsActionState,
    FormData
  >(saveEmailTemplatesAction, undefined);
  useActionFeedback(state);

  const [testState, testAction, isTesting] = useActionState<
    SettingsActionState,
    FormData
  >(sendCommunicationSampleAction, undefined);
  useActionFeedback(testState);

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex max-w-2xl flex-col gap-6">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="classReminderSubject">
              {translate("labels.classReminderSubject")}
            </Label>
            <Input
              id="classReminderSubject"
              name="classReminderSubject"
              defaultValue={templates.classReminderSubject}
            />
            <Label htmlFor="classReminderBody">
              {translate("labels.classReminderBody")}
            </Label>
            <Textarea
              id="classReminderBody"
              name="classReminderBody"
              rows={4}
              defaultValue={templates.classReminderBody}
            />
            <p className="text-muted-foreground text-xs">
              {translate("placeholders", {
                fields:
                  "{{studentName}}, {{className}}, {{classTime}}, {{appName}}",
              })}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paymentReminderSubject">
              {translate("labels.paymentReminderSubject")}
            </Label>
            <Input
              id="paymentReminderSubject"
              name="paymentReminderSubject"
              defaultValue={templates.paymentReminderSubject}
            />
            <Label htmlFor="paymentReminderBody">
              {translate("labels.paymentReminderBody")}
            </Label>
            <Textarea
              id="paymentReminderBody"
              name="paymentReminderBody"
              rows={4}
              defaultValue={templates.paymentReminderBody}
            />
            <p className="text-muted-foreground text-xs">
              {translate("placeholders", {
                fields:
                  "{{studentName}}, {{invoiceNumber}}, {{dueDate}}, {{appName}}",
              })}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="birthdaySubject">
              {translate("labels.birthdaySubject")}
            </Label>
            <Input
              id="birthdaySubject"
              name="birthdaySubject"
              defaultValue={templates.birthdaySubject}
            />
            <Label htmlFor="birthdayBody">
              {translate("labels.birthdayBody")}
            </Label>
            <Textarea
              id="birthdayBody"
              name="birthdayBody"
              rows={4}
              defaultValue={templates.birthdayBody}
            />
            <p className="text-muted-foreground text-xs">
              {translate("placeholders", {
                fields: "{{studentName}}, {{appName}}",
              })}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bookingSubject">
              {translate("labels.bookingSubject")}
            </Label>
            <Input
              id="bookingSubject"
              name="bookingSubject"
              defaultValue={templates.bookingSubject}
            />
            <Label htmlFor="bookingBody">
              {translate("labels.bookingBody")}
            </Label>
            <Textarea
              id="bookingBody"
              name="bookingBody"
              rows={4}
              defaultValue={templates.bookingBody}
            />
            <p className="text-muted-foreground text-xs">
              {translate("placeholders", {
                fields:
                  "{{studentName}}, {{className}}, {{classTime}}, {{appName}}",
              })}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bookingStaffSubject">
              {translate("labels.bookingStaffSubject")}
            </Label>
            <Input
              id="bookingStaffSubject"
              name="bookingStaffSubject"
              defaultValue={templates.bookingStaffSubject}
            />
            <Label htmlFor="bookingStaffBody">
              {translate("labels.bookingStaffBody")}
            </Label>
            <Textarea
              id="bookingStaffBody"
              name="bookingStaffBody"
              rows={4}
              defaultValue={templates.bookingStaffBody}
            />
            <p className="text-muted-foreground text-xs">
              {translate("placeholders", {
                fields:
                  "{{studentName}}, {{bookingFor}}, {{contact}}, {{className}}, {{classTime}}, {{appName}}",
              })}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gradingInviteSubject">
              {translate("labels.gradingInviteSubject")}
            </Label>
            <Input
              id="gradingInviteSubject"
              name="gradingInviteSubject"
              defaultValue={templates.gradingInviteSubject}
            />
            <Label htmlFor="gradingInviteBody">
              {translate("labels.gradingInviteBody")}
            </Label>
            <Textarea
              id="gradingInviteBody"
              name="gradingInviteBody"
              rows={4}
              defaultValue={templates.gradingInviteBody}
            />
            <p className="text-muted-foreground text-xs">
              {translate("placeholders", {
                fields:
                  "{{studentName}}, {{disciplineName}}, {{eventName}}, {{eventDate}}, {{appName}}",
              })}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="trialFollowUpSubject">
              {translate("labels.trialFollowUpSubject")}
            </Label>
            <Input
              id="trialFollowUpSubject"
              name="trialFollowUpSubject"
              defaultValue={templates.trialFollowUpSubject}
            />
            <Label htmlFor="trialFollowUpBody">
              {translate("labels.trialFollowUpBody")}
            </Label>
            <Textarea
              id="trialFollowUpBody"
              name="trialFollowUpBody"
              rows={4}
              defaultValue={templates.trialFollowUpBody}
            />
            <p className="text-muted-foreground text-xs">
              {translate("placeholders", {
                fields: "{{studentName}}, {{trialDays}}, {{appName}}",
              })}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="agreementReminderSubject">
              {translate("labels.agreementReminderSubject")}
            </Label>
            <Input
              id="agreementReminderSubject"
              name="agreementReminderSubject"
              defaultValue={templates.agreementReminderSubject}
            />
            <Label htmlFor="agreementReminderBody">
              {translate("labels.agreementReminderBody")}
            </Label>
            <Textarea
              id="agreementReminderBody"
              name="agreementReminderBody"
              rows={4}
              defaultValue={templates.agreementReminderBody}
            />
            <p className="text-muted-foreground text-xs">
              {translate("placeholders", {
                fields: "{{studentName}}, {{documentTitle}}, {{appName}}",
              })}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="verificationReminderSubject">
              {translate("labels.verificationReminderSubject")}
            </Label>
            <Input
              id="verificationReminderSubject"
              name="verificationReminderSubject"
              defaultValue={templates.verificationReminderSubject}
            />
            <Label htmlFor="verificationReminderBody">
              {translate("labels.verificationReminderBody")}
            </Label>
            <Textarea
              id="verificationReminderBody"
              name="verificationReminderBody"
              rows={4}
              defaultValue={templates.verificationReminderBody}
            />
            <p className="text-muted-foreground text-xs">
              {translate("placeholders", {
                fields:
                  "{{trainerName}}, {{verificationName}}, {{expiryDate}}, {{appName}}",
              })}
            </p>
          </div>
        </div>

        {state && !state.ok ? (
          <p className="text-destructive text-sm" role="alert">
            {state.message}
          </p>
        ) : null}
        {state && state.ok ? (
          <p className="text-success text-sm" role="status">
            {state.message}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? translate("saving") : translate("save")}
          </Button>
        </div>
      </form>

      <Separator />

      <form action={testAction} className="flex max-w-md flex-col gap-3">
        <div>
          <Label>{translate("sampleTitle")}</Label>
          <p className="text-muted-foreground text-xs">
            {translate("sampleHint")}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="sample-recipient">{translate("recipient")}</Label>
            <Input
              id="sample-recipient"
              name="recipient"
              type="email"
              placeholder="office@example.com"
              required
            />
          </div>
          <Button type="submit" variant="outline" disabled={isTesting}>
            {isTesting ? translate("sending") : translate("send")}
          </Button>
        </div>
        {testState && !testState.ok ? (
          <p className="text-destructive text-sm" role="alert">
            {testState.message}
          </p>
        ) : null}
        {testState && testState.ok ? (
          <p className="text-success text-sm" role="status">
            {testState.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { saveCommunicationsSettings } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type CommunicationsFormProps = {
  classRemindersEnabled: boolean;
  classReminderHoursBefore: number;
  paymentRemindersEnabled: boolean;
  paymentReminderDaysBeforeDue: number;
  paymentReminderOverdueDays: number;
  birthdayEmailsEnabled: boolean;
  trialFollowUpsEnabled: boolean;
  trialFollowUpDaysAfterJoin: number;
  bookingConfirmationsEnabled: boolean;
  bookingStaffAlertsEnabled: boolean;
  bookingStaffAlertRecipients: string[];
  agreementRemindersEnabled: boolean;
  verificationRemindersEnabled: boolean;
  verificationReminderDaysBefore: number;
  verificationReminderRecipients: string[];
};

type SettingsActionState = { ok: boolean; message: string } | undefined;

export function CommunicationsForm(props: CommunicationsFormProps) {
  const fingerprint = JSON.stringify(props);
  return <CommunicationsFormInner key={fingerprint} {...props} />;
}

function CommunicationsFormInner({
  classRemindersEnabled,
  classReminderHoursBefore,
  paymentRemindersEnabled,
  paymentReminderDaysBeforeDue,
  paymentReminderOverdueDays,
  birthdayEmailsEnabled,
  trialFollowUpsEnabled,
  trialFollowUpDaysAfterJoin,
  bookingConfirmationsEnabled,
  bookingStaffAlertsEnabled,
  bookingStaffAlertRecipients,
  agreementRemindersEnabled,
  verificationRemindersEnabled,
  verificationReminderDaysBefore,
  verificationReminderRecipients,
}: CommunicationsFormProps) {
  const translate = useTranslations("Admin.communications.form");
  const [state, formAction, isPending] = useActionState<
    SettingsActionState,
    FormData
  >(saveCommunicationsSettings, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>{translate("classTitle")}</Label>
        <p className="text-muted-foreground text-xs">
          {translate("classHint")}
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="classRemindersEnabled"
            defaultChecked={classRemindersEnabled}
          />
          {translate("classEnable")}
        </label>
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="classReminderHoursBefore">
            {translate("classHours")}
          </Label>
          <Input
            id="classReminderHoursBefore"
            name="classReminderHoursBefore"
            type="number"
            min={1}
            max={48}
            defaultValue={classReminderHoursBefore}
          />
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label>{translate("paymentTitle")}</Label>
        <p className="text-muted-foreground text-xs">
          {translate("paymentHint")}
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="paymentRemindersEnabled"
            defaultChecked={paymentRemindersEnabled}
          />
          {translate("paymentEnable")}
        </label>
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="paymentReminderDaysBeforeDue">
            {translate("paymentDays")}
          </Label>
          <Input
            id="paymentReminderDaysBeforeDue"
            name="paymentReminderDaysBeforeDue"
            type="number"
            min={0}
            max={30}
            defaultValue={paymentReminderDaysBeforeDue}
          />
          <Label htmlFor="paymentReminderOverdueDays">
            {translate("paymentOverdue")}
          </Label>
          <Input
            id="paymentReminderOverdueDays"
            name="paymentReminderOverdueDays"
            type="number"
            min={1}
            max={90}
            defaultValue={paymentReminderOverdueDays}
          />
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label>{translate("birthdayTitle")}</Label>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="birthdayEmailsEnabled"
            defaultChecked={birthdayEmailsEnabled}
          />
          {translate("birthdayEnable")}
        </label>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label>{translate("trialTitle")}</Label>
        <p className="text-muted-foreground text-xs">
          {translate("trialHint")}
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="trialFollowUpsEnabled"
            defaultChecked={trialFollowUpsEnabled}
          />
          {translate("trialEnable")}
        </label>
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="trialFollowUpDaysAfterJoin">
            {translate("trialDays")}
          </Label>
          <Input
            id="trialFollowUpDaysAfterJoin"
            name="trialFollowUpDaysAfterJoin"
            type="number"
            min={1}
            max={60}
            defaultValue={trialFollowUpDaysAfterJoin}
          />
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label>{translate("bookingTitle")}</Label>
        <p className="text-muted-foreground text-xs">
          {translate("bookingHint")}
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="bookingConfirmationsEnabled"
            defaultChecked={bookingConfirmationsEnabled}
          />
          {translate("bookingEnable")}
        </label>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label>{translate("staffTitle")}</Label>
        <p className="text-muted-foreground text-xs">
          {translate("staffHint")}
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="bookingStaffAlertsEnabled"
            defaultChecked={bookingStaffAlertsEnabled}
          />
          {translate("staffEnable")}
        </label>
        <div className="grid max-w-md gap-2">
          <Label htmlFor="bookingStaffAlertRecipients">
            {translate("staffRecipients")}
          </Label>
          <Input
            id="bookingStaffAlertRecipients"
            name="bookingStaffAlertRecipients"
            type="text"
            placeholder="sensei@example.com, owner@example.com"
            defaultValue={bookingStaffAlertRecipients.join(", ")}
          />
          <p className="text-muted-foreground text-xs">
            {translate("staffRecipientsHint")}
          </p>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label>{translate("agreementTitle")}</Label>
        <p className="text-muted-foreground text-xs">
          {translate("agreementHint")}
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="agreementRemindersEnabled"
            defaultChecked={agreementRemindersEnabled}
          />
          {translate("agreementEnable")}
        </label>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label>{translate("verificationTitle")}</Label>
        <p className="text-muted-foreground text-xs">
          {translate("verificationHint")}
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="verificationRemindersEnabled"
            defaultChecked={verificationRemindersEnabled}
          />
          {translate("verificationEnable")}
        </label>
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="verificationReminderDaysBefore">
            {translate("verificationDays")}
          </Label>
          <Input
            id="verificationReminderDaysBefore"
            name="verificationReminderDaysBefore"
            type="number"
            min={1}
            max={365}
            defaultValue={verificationReminderDaysBefore}
          />
        </div>
        <div className="grid max-w-md gap-2">
          <Label htmlFor="verificationReminderRecipients">
            {translate("verificationRecipients")}
          </Label>
          <Input
            id="verificationReminderRecipients"
            name="verificationReminderRecipients"
            type="text"
            placeholder="office@example.com"
            defaultValue={verificationReminderRecipients.join(", ")}
          />
          <p className="text-muted-foreground text-xs">
            {translate("verificationRecipientsHint")}
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
  );
}

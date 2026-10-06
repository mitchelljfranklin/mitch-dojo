"use client";

import { useActionState } from "react";

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
}: CommunicationsFormProps) {
  const [state, formAction, isPending] = useActionState<
    SettingsActionState,
    FormData
  >(saveCommunicationsSettings, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>Class reminders</Label>
        <p className="text-muted-foreground text-xs">
          Emailed to students (guardian fallback) of the class&apos;s discipline
          and location, ahead of each session.
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="classRemindersEnabled"
            defaultChecked={classRemindersEnabled}
          />
          Enable class reminders
        </label>
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="classReminderHoursBefore">Hours before class</Label>
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
        <Label>Payment reminders</Label>
        <p className="text-muted-foreground text-xs">
          Sent once per invoice when it enters the due-soon window, and once
          more when it has been overdue for the given days.
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="paymentRemindersEnabled"
            defaultChecked={paymentRemindersEnabled}
          />
          Enable payment reminders
        </label>
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="paymentReminderDaysBeforeDue">
            Days before due date
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
            Days overdue before the overdue reminder
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
        <Label>Birthday emails</Label>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="birthdayEmailsEnabled"
            defaultChecked={birthdayEmailsEnabled}
          />
          Enable birthday emails (sent on the day)
        </label>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label>Trial follow-ups</Label>
        <p className="text-muted-foreground text-xs">
          One email per open trial, this many days after the class the prospect
          booked (or after they joined the pipeline for walk-ins), if they have
          not converted.
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="trialFollowUpsEnabled"
            defaultChecked={trialFollowUpsEnabled}
          />
          Enable trial follow-up emails
        </label>
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="trialFollowUpDaysAfterJoin">
            Days after the trial date before follow-up
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
        <Label>Booking confirmations</Label>
        <p className="text-muted-foreground text-xs">
          One confirmation email to the prospect the moment their booking lands
          on the public booking page. Deduped per booking.
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="bookingConfirmationsEnabled"
            defaultChecked={bookingConfirmationsEnabled}
          />
          Enable booking confirmation emails
        </label>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label>New booking alerts (staff)</Label>
        <p className="text-muted-foreground text-xs">
          One alert email per recipient every time a booking lands on the public
          booking page, so staff see it without opening the Trials page.
          Template editable under Admin → Templates.
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="bookingStaffAlertsEnabled"
            defaultChecked={bookingStaffAlertsEnabled}
          />
          Enable new-booking alert emails
        </label>
        <div className="grid max-w-md gap-2">
          <Label htmlFor="bookingStaffAlertRecipients">
            Alert recipients (comma-separated emails)
          </Label>
          <Input
            id="bookingStaffAlertRecipients"
            name="bookingStaffAlertRecipients"
            type="text"
            placeholder="sensei@example.com, owner@example.com"
            defaultValue={bookingStaffAlertRecipients.join(", ")}
          />
          <p className="text-muted-foreground text-xs">
            Alerts start once at least one address is saved.
          </p>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label>Agreement reminders</Label>
        <p className="text-muted-foreground text-xs">
          One email per student per unsigned or out-of-date agreement. Bumping a
          document&apos;s version re-arms the reminder. Template editable under
          Admin → Templates.
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="agreementRemindersEnabled"
            defaultChecked={agreementRemindersEnabled}
          />
          Enable agreement reminder emails
        </label>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label>Verification reminders</Label>
        <p className="text-muted-foreground text-xs">
          One email per trainer per expiring or expired credential (e.g. a
          working-with-children check). Renewing the record re-arms it.
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="verificationRemindersEnabled"
            defaultChecked={verificationRemindersEnabled}
          />
          Enable verification reminder emails
        </label>
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="verificationReminderDaysBefore">
            Days before expiry to remind
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
          {isPending ? "Saving..." : "Save communication settings"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  saveCommunicationsSettings,
  sendCommunicationSampleAction,
} from "./actions";
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
  templates: {
    classReminderSubject: string;
    classReminderBody: string;
    paymentReminderSubject: string;
    paymentReminderBody: string;
    birthdaySubject: string;
    birthdayBody: string;
    trialFollowUpSubject: string;
    trialFollowUpBody: string;
  };
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
  templates,
}: CommunicationsFormProps) {
  const [state, formAction, isPending] = useActionState<
    SettingsActionState,
    FormData
  >(saveCommunicationsSettings, undefined);
  useActionFeedback(state);

  const [testState, testAction, isTesting] = useActionState<
    SettingsActionState,
    FormData
  >(sendCommunicationSampleAction, undefined);
  useActionFeedback(testState);

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label>Class reminders</Label>
          <p className="text-muted-foreground text-xs">
            Emailed to students (guardian fallback) of the class&apos;s
            discipline and location, ahead of each session.
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
            One email per open trial once it has sat in the pipeline this many
            days without converting.
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
              Days in pipeline before follow-up
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

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="classReminderSubject">Class reminder subject</Label>
            <Input
              id="classReminderSubject"
              name="classReminderSubject"
              defaultValue={templates.classReminderSubject}
            />
            <Label htmlFor="classReminderBody">Class reminder body</Label>
            <Textarea
              id="classReminderBody"
              name="classReminderBody"
              rows={4}
              defaultValue={templates.classReminderBody}
            />
            <p className="text-muted-foreground text-xs">
              Placeholders: {"{{studentName}}"}, {"{{className}}"},
              {" {{classTime}}"}, {"{{appName}}"}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paymentReminderSubject">
              Payment reminder subject
            </Label>
            <Input
              id="paymentReminderSubject"
              name="paymentReminderSubject"
              defaultValue={templates.paymentReminderSubject}
            />
            <Label htmlFor="paymentReminderBody">Payment reminder body</Label>
            <Textarea
              id="paymentReminderBody"
              name="paymentReminderBody"
              rows={4}
              defaultValue={templates.paymentReminderBody}
            />
            <p className="text-muted-foreground text-xs">
              Placeholders: {"{{studentName}}"}, {"{{invoiceNumber}}"},
              {" {{dueDate}}"}, {"{{appName}}"}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="birthdaySubject">Birthday subject</Label>
            <Input
              id="birthdaySubject"
              name="birthdaySubject"
              defaultValue={templates.birthdaySubject}
            />
            <Label htmlFor="birthdayBody">Birthday body</Label>
            <Textarea
              id="birthdayBody"
              name="birthdayBody"
              rows={4}
              defaultValue={templates.birthdayBody}
            />
            <p className="text-muted-foreground text-xs">
              Placeholders: {"{{studentName}}"}, {"{{appName}}"}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="trialFollowUpSubject">
              Trial follow-up subject
            </Label>
            <Input
              id="trialFollowUpSubject"
              name="trialFollowUpSubject"
              defaultValue={templates.trialFollowUpSubject}
            />
            <Label htmlFor="trialFollowUpBody">Trial follow-up body</Label>
            <Textarea
              id="trialFollowUpBody"
              name="trialFollowUpBody"
              rows={4}
              defaultValue={templates.trialFollowUpBody}
            />
            <p className="text-muted-foreground text-xs">
              Placeholders: {"{{studentName}}"}, {"{{trialDays}}"},
              {" {{appName}}"}
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
            {isPending ? "Saving..." : "Save communication settings"}
          </Button>
        </div>
      </form>

      <Separator />

      <form action={testAction} className="flex max-w-md flex-col gap-3">
        <div>
          <Label>Send a sample reminder</Label>
          <p className="text-muted-foreground text-xs">
            Sends one sample class-reminder email through your configured SMTP
            so you can check the templates render correctly.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="sample-recipient">Recipient</Label>
            <Input
              id="sample-recipient"
              name="recipient"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <Button type="submit" variant="outline" disabled={isTesting}>
            {isTesting ? "Sending..." : "Send sample"}
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

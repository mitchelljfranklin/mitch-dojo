"use client";

import { useActionState } from "react";

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
    trialFollowUpSubject: string;
    trialFollowUpBody: string;
  };
};

type SettingsActionState = { ok: boolean; message: string } | undefined;

export function EmailTemplatesForm(props: EmailTemplatesFormProps) {
  const fingerprint = JSON.stringify(props);
  return <EmailTemplatesFormInner key={fingerprint} {...props} />;
}

function EmailTemplatesFormInner({ templates }: EmailTemplatesFormProps) {
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
            <Label htmlFor="bookingSubject">Booking confirmation subject</Label>
            <Input
              id="bookingSubject"
              name="bookingSubject"
              defaultValue={templates.bookingSubject}
            />
            <Label htmlFor="bookingBody">Booking confirmation body</Label>
            <Textarea
              id="bookingBody"
              name="bookingBody"
              rows={4}
              defaultValue={templates.bookingBody}
            />
            <p className="text-muted-foreground text-xs">
              Placeholders: {"{{studentName}}"}, {"{{className}}"},
              {" {{classTime}}"}, {"{{appName}}"}
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
            {isPending ? "Saving..." : "Save email templates"}
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
              placeholder="[EMAIL]"
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

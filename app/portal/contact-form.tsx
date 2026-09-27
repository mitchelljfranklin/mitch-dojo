"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { type PortalContact } from "@/lib/db/portal";

import {
  type PortalContactState,
  updatePortalContactAction,
  updatePortalPreferencesAction,
} from "./contact-actions";

export function PortalContactForm({ contact }: { contact: PortalContact }) {
  const [state, formAction, isPending] = useActionState<
    PortalContactState,
    FormData
  >(updatePortalContactAction, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="studentId" value={contact.studentId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={contact.email ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={contact.phone ?? ""} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="addressLine">Address</Label>
        <Input
          id="addressLine"
          name="addressLine"
          defaultValue={contact.addressLine ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="city">City / suburb</Label>
          <Input id="city" name="city" defaultValue={contact.city ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="state">State / region</Label>
          <Input id="state" name="state" defaultValue={contact.state ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="postcode">Postcode</Label>
          <Input
            id="postcode"
            name="postcode"
            defaultValue={contact.postcode ?? ""}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="country">Country (2-letter code)</Label>
        <Input
          id="country"
          name="country"
          maxLength={2}
          defaultValue={contact.country ?? ""}
          placeholder="e.g. AU"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="emergencyContactName">Emergency contact name</Label>
        <Input
          id="emergencyContactName"
          name="emergencyContactName"
          defaultValue={contact.emergencyContactName ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="emergencyContactPhone">Emergency contact phone</Label>
        <Input
          id="emergencyContactPhone"
          name="emergencyContactPhone"
          defaultValue={contact.emergencyContactPhone ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="guardianName">Guardian name</Label>
          <Input
            id="guardianName"
            name="guardianName"
            defaultValue={contact.guardianName ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="guardianRelationship">Guardian relationship</Label>
          <Input
            id="guardianRelationship"
            name="guardianRelationship"
            defaultValue={contact.guardianRelationship ?? ""}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="guardianEmail">Guardian email</Label>
          <Input
            id="guardianEmail"
            name="guardianEmail"
            type="email"
            defaultValue={contact.guardianEmail ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="guardianPhone">Guardian phone</Label>
          <Input
            id="guardianPhone"
            name="guardianPhone"
            defaultValue={contact.guardianPhone ?? ""}
          />
        </div>
      </div>
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save contact details"}
        </Button>
      </div>
    </form>
  );
}

export function PortalPreferencesForm({
  studentId,
  emailOptOut,
}: {
  studentId: string;
  emailOptOut: boolean;
}) {
  const [state, formAction, isPending] = useActionState<
    PortalContactState,
    FormData
  >(updatePortalPreferencesAction, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="studentId" value={studentId} />
      <label className="flex w-fit items-center gap-2 text-sm">
        <Checkbox name="emailOptOut" defaultChecked={emailOptOut} />
        Pause non-essential emails (class reminders, birthdays, agreements)
      </label>
      <p className="text-muted-foreground text-xs">
        Payment reminders and account emails are always sent. Ask us at the dojo
        about any other mail.
      </p>
      <div>
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? "Saving..." : "Save email preference"}
        </Button>
      </div>
    </form>
  );
}

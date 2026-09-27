"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  createHouseholdAction,
  type HouseholdActionState,
} from "@/lib/actions/households";

export function CreateHouseholdForm() {
  const [state, formAction, isPending] = useActionState<
    HouseholdActionState,
    FormData
  >(createHouseholdAction, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="household-name">Household name *</Label>
          <Input
            id="household-name"
            name="name"
            required
            maxLength={80}
            placeholder="e.g. The Smiths"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="household-contact-name">Contact name</Label>
          <Input
            id="household-contact-name"
            name="contactName"
            maxLength={80}
            placeholder="Parent / guardian"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="household-contact-email">Contact email</Label>
          <Input
            id="household-contact-email"
            name="contactEmail"
            type="email"
            maxLength={120}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="household-contact-phone">Contact phone</Label>
          <Input
            id="household-contact-phone"
            name="contactPhone"
            type="tel"
            maxLength={40}
          />
        </div>
      </div>
      {state && "error" in state ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state && "ok" in state && state.ok ? (
        <p className="text-success text-sm" role="status">
          {state.message}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create household"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  type MembershipActionState,
  importEnrollmentsAction,
} from "@/lib/actions/memberships";

export function EnrollmentImportForm() {
  const [state, formAction, isPending] = useActionState<
    MembershipActionState,
    FormData
  >(importEnrollmentsAction, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-2">
        <Label htmlFor="enrollment-import-file">CSV file</Label>
        <Input
          id="enrollment-import-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="cursor-pointer"
        />
      </div>
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Importing…" : "Import enrollments"}
        </Button>
      </div>
    </form>
  );
}

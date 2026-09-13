"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  importStudentsAction,
  type StudentsImportState,
} from "@/lib/actions/students";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export function StudentImportForm() {
  const [state, formAction, isPending] = useActionState<
    StudentsImportState,
    FormData
  >(importStudentsAction, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-2">
        <Label htmlFor="import-file">CSV file</Label>
        <Input
          id="import-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="cursor-pointer"
        />
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
          {isPending ? "Importing..." : "Import"}
        </Button>
      </div>
    </form>
  );
}

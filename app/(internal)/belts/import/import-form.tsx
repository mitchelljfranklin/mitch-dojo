"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  importBeltHistoryAction,
  type BeltImportState,
} from "@/lib/actions/belts";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export function BeltImportForm({
  disciplines,
}: {
  disciplines: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState<
    BeltImportState,
    FormData
  >(importBeltHistoryAction, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-2">
        <Label htmlFor="belt-import-discipline">Discipline</Label>
        <select
          id="belt-import-discipline"
          name="disciplineId"
          required
          defaultValue={disciplines[0]?.id ?? ""}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          {disciplines.map((discipline) => (
            <option key={discipline.id} value={discipline.id}>
              {discipline.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="belt-import-file">CSV file</Label>
        <Input
          id="belt-import-file"
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

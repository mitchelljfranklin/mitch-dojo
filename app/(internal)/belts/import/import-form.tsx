"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

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
  const translate = useTranslations("Belts.import");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [disciplineId, setDisciplineId] = useState(disciplines[0]?.id ?? "");
  const [state, formAction, isPending] = useActionState<
    BeltImportState,
    FormData
  >(importBeltHistoryAction, undefined);
  useActionFeedback(state);

  // React 19 resets the form after each action; keep the chosen discipline and
  // (on errors) the chosen file, clearing the file only after a successful run.
  useEffect(() => {
    if (state && "ok" in state && state.ok && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [state]);

  return (
    <form
      action={formAction}
      onReset={(event) => event.preventDefault()}
      className="flex flex-col gap-3"
    >
      <div className="grid gap-2">
        <Label htmlFor="belt-import-discipline">
          {translate("discipline")}
        </Label>
        <select
          id="belt-import-discipline"
          name="disciplineId"
          required
          value={disciplineId}
          onChange={(event) => setDisciplineId(event.target.value)}
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
        <Label htmlFor="belt-import-file">{translate("csvFile")}</Label>
        <Input
          ref={fileInputRef}
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
          {isPending ? translate("importing") : translate("submit")}
        </Button>
      </div>
    </form>
  );
}

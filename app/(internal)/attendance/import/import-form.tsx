"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  importAttendanceAction,
  type AttendanceImportState,
} from "@/lib/actions/attendance";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export function AttendanceImportForm() {
  const translate = useTranslations("Attendance.import");
  const [state, formAction, isPending] = useActionState<
    AttendanceImportState,
    FormData
  >(importAttendanceAction, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-2">
        <Label htmlFor="attendance-import-file">{translate("csvFile")}</Label>
        <Input
          id="attendance-import-file"
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

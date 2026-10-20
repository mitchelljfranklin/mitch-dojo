"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type SettingsActionState = { ok: boolean; message: string } | undefined;

type RetentionAction = (
  state: SettingsActionState,
  formData: FormData,
) => Promise<SettingsActionState>;

type RetentionFormProps = {
  action: RetentionAction;
  fieldName: string;
  label: string;
  help: string;
  value: number;
};

// A single "keep N days" setting, embedded on the page of the feature whose
// data it prunes (audit log, email log).
export function RetentionForm({
  action,
  fieldName,
  label,
  help,
  value,
}: RetentionFormProps) {
  const translate = useTranslations("Common");
  const [state, formAction, isPending] = useActionState(action, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={fieldName}>{label}</Label>
        <p className="text-muted-foreground text-xs">{help}</p>
        <Input
          id={fieldName}
          name={fieldName}
          type="number"
          min={0}
          defaultValue={value}
          className="w-32"
        />
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
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? translate("saving") : translate("save")}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { saveSchedulingSettings } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type SchedulingFormProps = {
  cronLastRun: string | null;
  internalSchedulerEnabled: boolean;
};

export function SchedulingForm({
  cronLastRun,
  internalSchedulerEnabled,
}: SchedulingFormProps) {
  const translate = useTranslations("Admin.scheduling.form");
  const formatter = useFormatter();
  const [state, action, isPending] = useActionState(
    saveSchedulingSettings,
    undefined,
  );
  useActionFeedback(state);

  const lastRun = cronLastRun
    ? formatter.relativeTime(new Date(cronLastRun), new Date())
    : translate("never");

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Checkbox
            key={String(internalSchedulerEnabled)}
            id="internalSchedulerEnabled"
            name="internalSchedulerEnabled"
            defaultChecked={internalSchedulerEnabled}
          />
          <Label htmlFor="internalSchedulerEnabled">
            {translate("runInside")}
          </Label>
        </div>
        <p className="text-muted-foreground text-xs">
          {translate.rich("hint", {
            code: (chunks) => (
              <code className="bg-muted mx-1 rounded px-1 py-0.5 text-[11px]">
                {chunks}
              </code>
            ),
          })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? translate("saving") : translate("save")}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs" suppressHydrationWarning>
        {translate("lastRun", { when: lastRun })}
      </p>
    </form>
  );
}

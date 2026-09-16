"use client";

import { useActionState } from "react";

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
  const [state, action, isPending] = useActionState(
    saveSchedulingSettings,
    undefined,
  );
  useActionFeedback(state);

  const cronLabel = (() => {
    if (!cronLastRun) return "Never";
    const then = new Date(cronLastRun);
    const diffMs = new Date().getTime() - then.getTime();
    if (diffMs < 0) return "just now";
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "less than a minute ago";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  })();

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
            Run scheduled jobs inside the app
          </Label>
        </div>
        <p className="text-muted-foreground text-xs">
          When enabled, the application checks every five minutes for class,
          payment, birthday, and trial reminders, recurring invoices, log
          pruning, and orphaned file cleanup — no external cron job is needed.
          Disable this only if you trigger{" "}
          <code className="bg-muted mx-1 rounded px-1 py-0.5 text-[11px]">
            /api/cron/run
          </code>{" "}
          yourself (for example from a system crontab).
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save scheduling"}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        Last scheduled run: {cronLabel}
      </p>
    </form>
  );
}

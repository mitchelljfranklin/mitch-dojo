"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveOperationsSettings } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type OperationsFormProps = {
  loginRateLimitPerMin: number;
  sessionTimeoutMinutes: number;
  passwordResetPerMin: number;
  auditRetentionDays: number;
  emailLogRetentionDays: number;
  internalSchedulerEnabled: boolean;
  cronLastRun: string | null;
};

export function OperationsForm({
  loginRateLimitPerMin,
  sessionTimeoutMinutes,
  passwordResetPerMin,
  auditRetentionDays,
  emailLogRetentionDays,
  internalSchedulerEnabled,
  cronLastRun,
}: OperationsFormProps) {
  const [state, action, isPending] = useActionState(
    saveOperationsSettings,
    undefined,
  );
  useActionFeedback(state);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="loginRateLimit">Login rate limit (per minute)</Label>
        <p className="text-muted-foreground text-xs">
          Maximum sign-in attempts per IP address per minute. Increase for
          shared networks behind a single public IP.
        </p>
        <Input
          id="loginRateLimit"
          name="loginRateLimit"
          type="number"
          min={1}
          defaultValue={loginRateLimitPerMin}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sessionTimeoutMinutes">Auto-logout (minutes)</Label>
        <p className="text-muted-foreground text-xs">
          Automatically sign out after this many minutes of inactivity. Set to 0
          to disable.
        </p>
        <Input
          id="sessionTimeoutMinutes"
          name="sessionTimeoutMinutes"
          type="number"
          min={0}
          defaultValue={sessionTimeoutMinutes}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="passwordResetPerMin">
          Password reset requests / min (per email)
        </Label>
        <p className="text-muted-foreground text-xs">
          Limits staff password-reset emails for a given address.
        </p>
        <Input
          id="passwordResetPerMin"
          name="passwordResetPerMin"
          type="number"
          min={1}
          defaultValue={passwordResetPerMin}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="auditRetention">Audit log retention (days)</Label>
        <p className="text-muted-foreground text-xs">
          Audit entries older than this many days are automatically pruned by
          the scheduler. Set to 0 to keep indefinitely.
        </p>
        <Input
          id="auditRetention"
          name="auditRetention"
          type="number"
          min={0}
          defaultValue={auditRetentionDays}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="emailLogRetention">Email log retention (days)</Label>
        <p className="text-muted-foreground text-xs">
          Email send records older than this many days are automatically pruned
          by the scheduler. Set to 0 to keep indefinitely.
        </p>
        <Input
          id="emailLogRetention"
          name="emailLogRetention"
          type="number"
          min={0}
          defaultValue={emailLogRetentionDays}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Internal scheduler</Label>
        <p className="text-muted-foreground text-xs">
          Runs every 5 minutes: log pruning and the orphaned-file sweep. Disable
          to trigger <code className="text-xs">/api/cron/run</code> externally
          instead.
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="internalSchedulerEnabled"
            defaultChecked={internalSchedulerEnabled}
          />
          Enable internal scheduler
        </label>
        <p className="text-muted-foreground text-xs">
          Last run:{" "}
          {cronLastRun ? new Date(cronLastRun).toLocaleString() : "never"}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save operations"}
        </Button>
      </div>
    </form>
  );
}

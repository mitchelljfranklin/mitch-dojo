"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSignInSecuritySettings } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type SignInSecurityFormProps = {
  loginRateLimitPerMin: number;
  sessionTimeoutMinutes: number;
  passwordResetPerMin: number;
  breakGlassPerMin: number;
};

export function SignInSecurityForm({
  loginRateLimitPerMin,
  sessionTimeoutMinutes,
  passwordResetPerMin,
  breakGlassPerMin,
}: SignInSecurityFormProps) {
  const translate = useTranslations("Admin.signIn.sessions");
  const [state, action, isPending] = useActionState(
    saveSignInSecuritySettings,
    undefined,
  );
  useActionFeedback(state);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="loginRateLimit">{translate("loginRateLimit")}</Label>
        <p className="text-muted-foreground text-xs">
          {translate("loginRateLimitHint")}
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
        <Label htmlFor="sessionTimeoutMinutes">
          {translate("sessionTimeout")}
        </Label>
        <p className="text-muted-foreground text-xs">
          {translate("sessionTimeoutHint")}
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
          {translate("passwordReset")}
        </Label>
        <p className="text-muted-foreground text-xs">
          {translate("passwordResetHint")}
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
        <Label htmlFor="breakGlassPerMin">{translate("breakGlass")}</Label>
        <p className="text-muted-foreground text-xs">
          {translate("breakGlassHint")}
        </p>
        <Input
          id="breakGlassPerMin"
          name="breakGlassPerMin"
          type="number"
          min={1}
          defaultValue={breakGlassPerMin}
          className="w-32"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? translate("saving") : translate("save")}
        </Button>
      </div>
    </form>
  );
}

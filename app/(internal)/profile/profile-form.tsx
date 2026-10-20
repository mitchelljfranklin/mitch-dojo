"use client";

import { ActionForm } from "@/components/action-form";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ProfileState, updateProfileAction } from "@/lib/actions/profile";
import { useActionFeedback } from "@/hooks/use-action-feedback";

const initialState: ProfileState = undefined;

type ProfileFormProps = {
  name: string;
  email: string;
  hasLocalPassword: boolean;
};

export function ProfileForm(props: ProfileFormProps) {
  const fingerprint = JSON.stringify(props);
  return <ProfileFormInner key={fingerprint} {...props} />;
}

function ProfileFormInner({ name, email, hasLocalPassword }: ProfileFormProps) {
  const translate = useTranslations("Profile");
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    initialState,
  );
  useActionFeedback(state);

  return (
    <ActionForm action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{translate("account.title")}</CardTitle>
          <CardDescription>{translate("account.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="name">{translate("account.name")}</Label>
            <Input id="name" name="name" defaultValue={name} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{translate("account.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={email}
              required={hasLocalPassword}
              readOnly={!hasLocalPassword}
              aria-readonly={!hasLocalPassword}
              className={
                !hasLocalPassword ? "text-muted-foreground" : undefined
              }
            />
          </div>
        </CardContent>
      </Card>

      {hasLocalPassword ? (
        <Card>
          <CardHeader>
            <CardTitle>{translate("password.title")}</CardTitle>
            <CardDescription>
              {translate("password.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">
                {translate("password.current")}
              </Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="newPassword">
                  {translate("password.new")}{" "}
                  <span className="text-muted-foreground font-normal">
                    {translate("password.optional")}
                  </span>
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmNewPassword">
                  {translate("password.confirm")}
                </Label>
                <Input
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground text-sm">
          {translate("password.noLocal")}
        </p>
      )}

      {state?.message && !state.ok ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? translate("saving") : translate("save")}
        </Button>
      </div>
    </ActionForm>
  );
}

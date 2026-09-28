"use client";

import { ActionForm } from "@/components/action-form";
import { useActionState } from "react";

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
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    initialState,
  );
  useActionFeedback(state);

  return (
    <ActionForm action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Your name and sign-in email.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={name} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
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
            <CardTitle>Password</CardTitle>
            <CardDescription>
              You must enter your current password to make any changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Current password</Label>
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
                  New password{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
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
                <Label htmlFor="confirmNewPassword">Confirm new password</Label>
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
          This account has no local password, so there is nothing to change
          here.
        </p>
      )}

      {state?.message && !state.ok ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </ActionForm>
  );
}

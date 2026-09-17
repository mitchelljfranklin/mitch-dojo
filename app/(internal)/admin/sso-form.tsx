"use client";

import { type ReactNode, useActionState } from "react";

import { Button } from "@/components/ui/button";
import { CopyLink } from "@/components/copy-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  generateBreakGlassUrlAction,
  saveSsoSettings,
  type BreakGlassUrlState,
} from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type RoleOption = { id: string; name: string };

export type SsoFormProps = {
  entraIdEnabled: boolean;
  entraIdClientId: string;
  entraIdSecretConfigured: boolean;
  googleEnabled: boolean;
  googleClientId: string;
  googleSecretConfigured: boolean;
  oidcEnabled: boolean;
  oidcName: string;
  oidcIssuer: string;
  oidcClientId: string;
  oidcSecretConfigured: boolean;
  autoProvisionRoleId: string;
  roles: RoleOption[];
  allowedDomain: string;
  disableLocalAuth: boolean;
};

function SecretInput({
  id,
  name,
  configured,
}: {
  id: string;
  name: string;
  configured: boolean;
}) {
  return (
    <Input
      id={id}
      name={name}
      type="password"
      autoComplete="off"
      placeholder={configured ? "Stored — leave blank to keep" : ""}
      className="w-full"
    />
  );
}

function ProviderFields({
  title,
  description,
  enabled,
  enabledName,
  clientId,
  clientName,
  secretName,
  secretConfigured,
  clientIdLabel = "Client ID",
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  enabledName: string;
  clientId: string;
  clientName: string;
  secretName: string;
  secretConfigured: boolean;
  clientIdLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id={enabledName}
          name={enabledName}
          defaultChecked={enabled}
        />
        <Label htmlFor={enabledName} className="font-medium">
          Enable {title}
        </Label>
      </div>
      <p className="text-muted-foreground text-xs">{description}</p>
      <div className="grid gap-2">
        <Label htmlFor={clientName}>{clientIdLabel}</Label>
        <Input
          id={clientName}
          name={clientName}
          defaultValue={clientId}
          className="w-full"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${secretName}-label`}>Client secret</Label>
        <SecretInput
          id={`${secretName}-label`}
          name={secretName}
          configured={secretConfigured}
        />
      </div>
      {children}
    </div>
  );
}

const BREAK_GLASS_INITIAL: BreakGlassUrlState = undefined;

export function SsoForm(props: SsoFormProps) {
  const [state, action, isPending] = useActionState(saveSsoSettings, undefined);
  useActionFeedback(state);
  const [breakGlassState, breakGlassAction, breakGlassPending] = useActionState(
    generateBreakGlassUrlAction,
    BREAK_GLASS_INITIAL,
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-6">
        <ProviderFields
          title="Microsoft Entra ID"
          description="Single-tenant and multi-tenant Microsoft accounts. Callback URL: {APP_URL}/api/auth/callback/microsoft-entra-id"
          enabled={props.entraIdEnabled}
          enabledName="entraIdEnabled"
          clientId={props.entraIdClientId}
          clientName="entraIdClientId"
          secretName="entraIdClientSecret"
          secretConfigured={props.entraIdSecretConfigured}
        />

        <ProviderFields
          title="Google Workspace"
          description="Google OAuth2. Callback URL: {APP_URL}/api/auth/callback/google"
          enabled={props.googleEnabled}
          enabledName="googleEnabled"
          clientId={props.googleClientId}
          clientName="googleClientId"
          secretName="googleClientSecret"
          secretConfigured={props.googleSecretConfigured}
        />

        <ProviderFields
          title="Custom OIDC"
          description="Any OpenID Connect provider (Okta, Auth0, Keycloak, Authentik…). Callback URL: {APP_URL}/api/auth/callback/oidc"
          enabled={props.oidcEnabled}
          enabledName="oidcEnabled"
          clientId={props.oidcClientId}
          clientName="oidcClientId"
          secretName="oidcClientSecret"
          secretConfigured={props.oidcSecretConfigured}
        >
          <div className="grid gap-2">
            <Label htmlFor="oidcName">Display name</Label>
            <Input
              id="oidcName"
              name="oidcName"
              defaultValue={props.oidcName}
              placeholder="Okta"
              className="w-full"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="oidcIssuer">Issuer URL</Label>
            <Input
              id="oidcIssuer"
              name="oidcIssuer"
              defaultValue={props.oidcIssuer}
              placeholder="https://your-org.okta.com/oauth2/default"
              className="w-full"
            />
          </div>
        </ProviderFields>

        <div className="grid gap-2">
          <Label htmlFor="autoProvisionRoleId">
            Default role for new SSO users
          </Label>
          <p className="text-muted-foreground text-xs">
            First-time SSO sign-ins get an account automatically with this role.
            Falls back to Viewer if the selected role is deleted.
          </p>
          <select
            id="autoProvisionRoleId"
            name="autoProvisionRoleId"
            defaultValue={props.autoProvisionRoleId}
            className="border-input bg-background h-9 w-64 rounded-md border px-3 text-sm"
          >
            <option value="">No provisioning (existing accounts only)</option>
            {props.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="allowedDomain">Allowed email domain (optional)</Label>
          <p className="text-muted-foreground text-xs">
            When set, SSO sign-ins are refused unless the email ends with this
            domain — e.g. yourdojo.com.
          </p>
          <Input
            id="allowedDomain"
            name="allowedDomain"
            defaultValue={props.allowedDomain}
            placeholder="yourdojo.com"
            className="w-64"
          />
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="disableLocalAuth"
            name="disableLocalAuth"
            defaultChecked={props.disableLocalAuth}
          />
          <div className="grid gap-1">
            <Label htmlFor="disableLocalAuth">
              Disable email/password sign-in (SSO only)
            </Label>
            <p className="text-muted-foreground text-xs">
              Hides the local login form. Ignored while no SSO provider is fully
              configured, and a valid break-glass URL always restores the form.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending} size="sm">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
        <div className="grid gap-1">
          <Label className="font-medium">Break-glass sign-in URL</Label>
          <p className="text-muted-foreground text-xs">
            Generates a single-use URL that shows the local sign-in form for 24
            hours, even in SSO-only mode. Store it somewhere safe (password
            manager, sealed envelope) — it is shown once and generating a new
            one revokes the old.
          </p>
        </div>
        <form action={breakGlassAction} className="flex items-center gap-3">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={breakGlassPending}
          >
            {breakGlassPending
              ? "Generating…"
              : breakGlassState?.ok
                ? "Regenerate URL"
                : "Generate URL"}
          </Button>
        </form>
        {breakGlassState?.ok ? <CopyLink value={breakGlassState.url} /> : null}
      </div>
    </div>
  );
}

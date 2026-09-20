"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { saveEmailSettings, type SettingsActionState } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type EmailFormProps = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  fromAddress: string;
  fromName: string;
  smtpPasswordConfigured: boolean;
  smtpAuthType: string;
  smtpOAuth2Provider: string;
  smtpOAuth2ClientId: string;
  smtpOAuth2Tenant: string;
  smtpOAuth2ClientSecretConfigured: boolean;
  smtpOAuth2RefreshTokenConfigured: boolean;
};

const initialState: SettingsActionState = undefined;

export function EmailForm(props: EmailFormProps) {
  const fingerprint = JSON.stringify(props);
  return <EmailFormInner key={fingerprint} {...props} />;
}

function EmailFormInner({
  smtpHost,
  smtpPort,
  smtpUser,
  fromAddress,
  fromName,
  smtpPasswordConfigured,
  smtpAuthType,
  smtpOAuth2Provider,
  smtpOAuth2ClientId,
  smtpOAuth2Tenant,
  smtpOAuth2ClientSecretConfigured,
  smtpOAuth2RefreshTokenConfigured,
}: EmailFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveEmailSettings,
    initialState,
  );
  useActionFeedback(state);

  const [authType, setAuthType] = useState(smtpAuthType || "basic");
  const [oauth2Provider, setOauth2Provider] = useState(
    smtpOAuth2Provider || "google",
  );
  const isOauth2 = authType === "oauth2";
  const isMicrosoft = oauth2Provider === "microsoft";

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      <div className="grid gap-2">
        <Label htmlFor="smtp-host">SMTP host</Label>
        <Input id="smtp-host" name="smtpHost" defaultValue={smtpHost} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="smtp-port">SMTP port</Label>
        <Input
          id="smtp-port"
          name="smtpPort"
          type="number"
          min={1}
          max={65535}
          defaultValue={smtpPort}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="smtp-user">SMTP username</Label>
        <Input id="smtp-user" name="smtpUser" defaultValue={smtpUser} />
        <p className="text-muted-foreground text-xs">
          The mailbox the messages send from — your address for both auth modes.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="smtp-auth-type">Authentication</Label>
        <select
          id="smtp-auth-type"
          name="smtpAuthType"
          value={authType}
          onChange={(event) => setAuthType(event.target.value)}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="basic">Username & password</option>
          <option value="oauth2">OAuth2 (Gmail / Microsoft 365)</option>
        </select>
      </div>

      {isOauth2 ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="smtp-oauth2-provider">OAuth2 provider</Label>
            <select
              id="smtp-oauth2-provider"
              name="smtpOAuth2Provider"
              value={oauth2Provider}
              onChange={(event) => setOauth2Provider(event.target.value)}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="google">Google</option>
              <option value="microsoft">Microsoft (Entra ID)</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="smtp-oauth2-client-id">OAuth2 client ID</Label>
            <Input
              id="smtp-oauth2-client-id"
              name="smtpOAuth2ClientId"
              defaultValue={smtpOAuth2ClientId}
              autoComplete="off"
            />
          </div>
          {isMicrosoft ? (
            <div className="grid gap-2">
              <Label htmlFor="smtp-oauth2-tenant">Entra ID tenant ID</Label>
              <Input
                id="smtp-oauth2-tenant"
                name="smtpOAuth2Tenant"
                defaultValue={smtpOAuth2Tenant}
                placeholder="Directory (tenant) ID"
                autoComplete="off"
              />
              <p className="text-muted-foreground text-xs">
                Builds the token endpoint
                (login.microsoftonline.com/your-tenant-id) and the SMTP scope.
              </p>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="smtp-oauth2-client-secret">
              OAuth2 client secret
            </Label>
            <Input
              id="smtp-oauth2-client-secret"
              name="smtpOAuth2ClientSecret"
              type="password"
              autoComplete="off"
              placeholder={
                smtpOAuth2ClientSecretConfigured
                  ? "Leave blank to keep current secret"
                  : "Client secret value"
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="smtp-oauth2-refresh-token">
              OAuth2 refresh token
            </Label>
            <Input
              id="smtp-oauth2-refresh-token"
              name="smtpOAuth2RefreshToken"
              type="password"
              autoComplete="off"
              placeholder={
                smtpOAuth2RefreshTokenConfigured
                  ? "Leave blank to keep current token"
                  : "Refresh token from the consent flow"
              }
            />
            <p className="text-muted-foreground text-xs">
              {isMicrosoft
                ? "Delegated token with SMTP.Send scope, obtained offline (offline_access)."
                : "Google refresh token with the https://mail.google.com/ scope."}{" "}
              Stored encrypted at rest and never displayed.
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Preserve the OAuth2 non-secret config when saving in basic mode
              so toggling back doesn't lose the client setup. */}
          <input
            type="hidden"
            name="smtpOAuth2Provider"
            value={oauth2Provider}
          />
          <input
            type="hidden"
            name="smtpOAuth2ClientId"
            value={smtpOAuth2ClientId}
          />
          <input
            type="hidden"
            name="smtpOAuth2Tenant"
            value={smtpOAuth2Tenant}
          />
          <div className="grid gap-2">
            <Label htmlFor="smtp-password">SMTP password</Label>
            <Input
              id="smtp-password"
              name="smtpPassword"
              type="password"
              autoComplete="off"
              placeholder={
                smtpPasswordConfigured
                  ? "Leave blank to keep current password"
                  : "Enter SMTP password"
              }
            />
            <p className="text-muted-foreground text-xs">
              Stored encrypted at rest and never displayed.
            </p>
          </div>
        </>
      )}

      <div className="grid gap-2">
        <Label htmlFor="from-address">From address</Label>
        <Input
          id="from-address"
          name="fromAddress"
          type="email"
          defaultValue={fromAddress}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="from-name">From name</Label>
        <Input id="from-name" name="fromName" defaultValue={fromName} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

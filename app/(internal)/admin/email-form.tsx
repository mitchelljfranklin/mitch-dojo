"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

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
  const translate = useTranslations("Admin.email.form");
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
        <Label htmlFor="smtp-host">{translate("host")}</Label>
        <Input id="smtp-host" name="smtpHost" defaultValue={smtpHost} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="smtp-port">{translate("port")}</Label>
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
        <Label htmlFor="smtp-user">{translate("user")}</Label>
        <Input id="smtp-user" name="smtpUser" defaultValue={smtpUser} />
        <p className="text-muted-foreground text-xs">{translate("userHint")}</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="smtp-auth-type">{translate("auth")}</Label>
        <select
          id="smtp-auth-type"
          name="smtpAuthType"
          value={authType}
          onChange={(event) => setAuthType(event.target.value)}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="basic">{translate("authBasic")}</option>
          <option value="oauth2">{translate("authOAuth2")}</option>
        </select>
      </div>

      {isOauth2 ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="smtp-oauth2-provider">
              {translate("oauthProvider")}
            </Label>
            <select
              id="smtp-oauth2-provider"
              name="smtpOAuth2Provider"
              value={oauth2Provider}
              onChange={(event) => setOauth2Provider(event.target.value)}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="google">{translate("oauthGoogle")}</option>
              <option value="microsoft">{translate("oauthMicrosoft")}</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="smtp-oauth2-client-id">
              {translate("oauthClientId")}
            </Label>
            <Input
              id="smtp-oauth2-client-id"
              name="smtpOAuth2ClientId"
              defaultValue={smtpOAuth2ClientId}
              autoComplete="off"
            />
          </div>
          {isMicrosoft ? (
            <div className="grid gap-2">
              <Label htmlFor="smtp-oauth2-tenant">{translate("tenant")}</Label>
              <Input
                id="smtp-oauth2-tenant"
                name="smtpOAuth2Tenant"
                defaultValue={smtpOAuth2Tenant}
                placeholder={translate("tenantPlaceholder")}
                autoComplete="off"
              />
              <p className="text-muted-foreground text-xs">
                {translate("tenantHint")}
              </p>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="smtp-oauth2-client-secret">
              {translate("clientSecret")}
            </Label>
            <Input
              id="smtp-oauth2-client-secret"
              name="smtpOAuth2ClientSecret"
              type="password"
              autoComplete="off"
              placeholder={
                smtpOAuth2ClientSecretConfigured
                  ? translate("clientSecretKeep")
                  : translate("clientSecretPlaceholder")
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="smtp-oauth2-refresh-token">
              {translate("refreshToken")}
            </Label>
            <Input
              id="smtp-oauth2-refresh-token"
              name="smtpOAuth2RefreshToken"
              type="password"
              autoComplete="off"
              placeholder={
                smtpOAuth2RefreshTokenConfigured
                  ? translate("refreshTokenKeep")
                  : translate("refreshTokenPlaceholder")
              }
            />
            <p className="text-muted-foreground text-xs">
              {isMicrosoft
                ? translate("microsoftTokenHint")
                : translate("googleTokenHint")}{" "}
              {translate("tokenStored")}
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
            <Label htmlFor="smtp-password">{translate("password")}</Label>
            <Input
              id="smtp-password"
              name="smtpPassword"
              type="password"
              autoComplete="off"
              placeholder={
                smtpPasswordConfigured
                  ? translate("passwordKeep")
                  : translate("passwordPlaceholder")
              }
            />
            <p className="text-muted-foreground text-xs">
              {translate("passwordStored")}
            </p>
          </div>
        </>
      )}

      <div className="grid gap-2">
        <Label htmlFor="from-address">{translate("fromAddress")}</Label>
        <Input
          id="from-address"
          name="fromAddress"
          type="email"
          defaultValue={fromAddress}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="from-name">{translate("fromName")}</Label>
        <Input id="from-name" name="fromName" defaultValue={fromName} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? translate("saving") : translate("save")}
        </Button>
      </div>
    </form>
  );
}

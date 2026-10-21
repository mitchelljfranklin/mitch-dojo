"use client";

import { type ReactNode, useActionState } from "react";
import { useTranslations } from "next-intl";

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
  const translate = useTranslations("Admin.signIn.form");
  return (
    <Input
      id={id}
      name={name}
      type="password"
      autoComplete="off"
      placeholder={configured ? translate("storedPlaceholder") : ""}
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
  children?: ReactNode;
}) {
  const translate = useTranslations("Admin.signIn.form");
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id={enabledName}
          name={enabledName}
          defaultChecked={enabled}
        />
        <Label htmlFor={enabledName} className="font-medium">
          {translate("enable", { provider: title })}
        </Label>
      </div>
      <p className="text-muted-foreground text-xs">{description}</p>
      <div className="grid gap-2">
        <Label htmlFor={clientName}>{translate("clientId")}</Label>
        <Input
          id={clientName}
          name={clientName}
          defaultValue={clientId}
          className="w-full"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${secretName}-label`}>
          {translate("clientSecret")}
        </Label>
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
  const translate = useTranslations("Admin.signIn.form");
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
          title={translate("titles.entra")}
          description={translate("providers.entra", {
            callbackUrl: "{APP_URL}/api/auth/callback/microsoft-entra-id",
          })}
          enabled={props.entraIdEnabled}
          enabledName="entraIdEnabled"
          clientId={props.entraIdClientId}
          clientName="entraIdClientId"
          secretName="entraIdClientSecret"
          secretConfigured={props.entraIdSecretConfigured}
        />

        <ProviderFields
          title={translate("titles.google")}
          description={translate("providers.google", {
            callbackUrl: "{APP_URL}/api/auth/callback/google",
          })}
          enabled={props.googleEnabled}
          enabledName="googleEnabled"
          clientId={props.googleClientId}
          clientName="googleClientId"
          secretName="googleClientSecret"
          secretConfigured={props.googleSecretConfigured}
        />

        <ProviderFields
          title={translate("titles.oidc")}
          description={translate("providers.oidc", {
            callbackUrl: "{APP_URL}/api/auth/callback/oidc",
          })}
          enabled={props.oidcEnabled}
          enabledName="oidcEnabled"
          clientId={props.oidcClientId}
          clientName="oidcClientId"
          secretName="oidcClientSecret"
          secretConfigured={props.oidcSecretConfigured}
        >
          <div className="grid gap-2">
            <Label htmlFor="oidcName">{translate("displayName")}</Label>
            <Input
              id="oidcName"
              name="oidcName"
              defaultValue={props.oidcName}
              placeholder="Okta"
              className="w-full"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="oidcIssuer">{translate("issuerUrl")}</Label>
            <Input
              id="oidcIssuer"
              name="oidcIssuer"
              defaultValue={props.oidcIssuer}
              placeholder={translate("issuerPlaceholder")}
              className="w-full"
            />
          </div>
        </ProviderFields>

        <div className="grid gap-2">
          <Label htmlFor="autoProvisionRoleId">
            {translate("autoProvisionRole")}
          </Label>
          <p className="text-muted-foreground text-xs">
            {translate("autoProvisionHint")}
          </p>
          <select
            id="autoProvisionRoleId"
            name="autoProvisionRoleId"
            defaultValue={props.autoProvisionRoleId}
            className="border-input bg-background h-9 w-80 rounded-md border px-3 text-sm"
          >
            <option value="">{translate("noProvisioning")}</option>
            {props.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="allowedDomain">{translate("allowedDomain")}</Label>
          <p className="text-muted-foreground text-xs">
            {translate("allowedDomainHint")}
          </p>
          <Input
            id="allowedDomain"
            name="allowedDomain"
            defaultValue={props.allowedDomain}
            placeholder={translate("allowedDomainPlaceholder")}
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
              {translate("disableLocalAuth")}
            </Label>
            <p className="text-muted-foreground text-xs">
              {translate("disableLocalAuthHint")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending} size="sm">
            {isPending ? translate("saving") : translate("save")}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
        <div className="grid gap-1">
          <Label className="font-medium">{translate("breakGlassTitle")}</Label>
          <p className="text-muted-foreground text-xs">
            {translate("breakGlassHint")}
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
              ? translate("generating")
              : breakGlassState?.ok
                ? translate("regenerate")
                : translate("generate")}
          </Button>
        </form>
        {breakGlassState?.ok ? <CopyLink value={breakGlassState.url} /> : null}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { isLoopbackUrl, env } from "@/lib/env";
import { PERMISSIONS } from "@/lib/permissions";
import { getEmailSettings } from "@/lib/settings";

import { EmailForm } from "../email-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.email");
  return { title: translate("metaTitle") };
}

export default async function AdminEmailPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translate = await getTranslations("Admin.email");
  const email = await getEmailSettings();
  // Emails embed absolute links (logo, portal links, resets) built from
  // APP_URL — a loopback APP_URL breaks them for every real recipient, so
  // warn loudly the moment SMTP is configured against one.
  const loopbackWarning =
    email.smtpHost.length > 0 && isLoopbackUrl(env.APP_URL)
      ? translate("loopbackWarning", { appUrl: env.APP_URL })
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translate("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{translate("subtitle")}</p>
      </div>

      {loopbackWarning ? (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive text-base">
              {translate("loopbackTitle")}
            </CardTitle>
            <CardDescription>{loopbackWarning}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{translate("cardTitle")}</CardTitle>
          <CardDescription>{translate("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmailForm
            smtpHost={email.smtpHost}
            smtpPort={email.smtpPort}
            smtpUser={email.smtpUser}
            fromAddress={email.fromAddress}
            fromName={email.fromName}
            smtpPasswordConfigured={email.smtpPasswordConfigured}
            smtpAuthType={email.smtpAuthType}
            smtpOAuth2Provider={email.smtpOAuth2Provider}
            smtpOAuth2ClientId={email.smtpOAuth2ClientId}
            smtpOAuth2Tenant={email.smtpOAuth2Tenant}
            smtpOAuth2ClientSecretConfigured={
              email.smtpOAuth2ClientSecretConfigured
            }
            smtpOAuth2RefreshTokenConfigured={
              email.smtpOAuth2RefreshTokenConfigured
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

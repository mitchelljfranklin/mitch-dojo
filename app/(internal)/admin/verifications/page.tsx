import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { FlashToast } from "@/components/flash-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listVerificationTypes } from "@/lib/db/verifications";

import { VerificationTypesManager } from "./verification-types-manager";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.verifications");
  return { title: translate("metaTitle") };
}

type AdminVerificationsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminVerificationsPage({
  searchParams,
}: AdminVerificationsPageProps) {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translate = await getTranslations("Admin.verifications");
  const query = await searchParams;
  const types = await listVerificationTypes();

  return (
    <div className="flex flex-col gap-6">
      {query.error ? (
        <FlashToast message={query.error} variant="error" />
      ) : null}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translate("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{translate("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translate("cardTitle")}</CardTitle>
          <CardDescription>{translate("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <VerificationTypesManager types={types} />
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

import { EnrollmentImportForm } from "./enrollment-import-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Memberships.import");
  return { title: translate("metaTitle") };
}

export default async function ImportEnrollmentsPage() {
  await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);
  const translate = await getTranslations("Memberships.import");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translate("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translate("subtitle")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/memberships">{translate("back")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translate("formatTitle")}</CardTitle>
          <CardDescription>{translate("formatDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="overflow-x-auto rounded-md border p-3 font-mono text-xs">
            Email,FirstName,LastName,Plan,StartDate
            <br />
            jane@example.com,Jane,Doe,Adult monthly,2026-09-01
            <br />
            ,Sam,Smith,Kids monthly,
          </div>
          <ul className="text-muted-foreground list-disc pl-5 text-xs">
            <li>
              {translate.rich("studentLine", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </li>
            <li>
              {translate.rich("planLine", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </li>
            <li>
              {translate.rich("dateLine", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </li>
            <li>{translate("skipLine")}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{translate("uploadTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <EnrollmentImportForm />
        </CardContent>
      </Card>
    </div>
  );
}

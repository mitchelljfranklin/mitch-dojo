import { Breadcrumbs } from "@/components/breadcrumbs";
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
import { PERMISSIONS } from "@/lib/permissions";

import { AttendanceImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Attendance.import");
  return { title: t("metaTitle") };
}

export default async function ImportAttendancePage() {
  await requirePermission(PERMISSIONS.ATTENDANCE_MARK);
  const t = await getTranslations("Attendance.import");
  const classesT = await getTranslations("Classes");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: classesT("title"), href: "/classes" },
          { label: t("breadcrumb") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("cardTitle")}</CardTitle>
          <CardDescription>{t("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-sm">
            <p className="mb-2 font-medium">{t("columns")}</p>
            <ul className="text-muted-foreground list-disc pl-5 text-xs">
              <li>
                <code>Date</code> — {t("dateLine")}
              </li>
              <li>
                <code>Course</code> — {t("courseLine")}
              </li>
              <li>
                <code>Email</code> — {t("studentLine")}
              </li>
              <li>
                <code>Status</code> — {t("statusLine")}
              </li>
            </ul>
            <p className="text-muted-foreground mt-2 text-xs">{t("note")}</p>
          </div>
          <AttendanceImportForm />
        </CardContent>
      </Card>
    </div>
  );
}

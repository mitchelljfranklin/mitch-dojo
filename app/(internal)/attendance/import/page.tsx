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
  const translate = await getTranslations("Attendance.import");
  return { title: translate("metaTitle") };
}

export default async function ImportAttendancePage() {
  await requirePermission(PERMISSIONS.ATTENDANCE_MARK);
  const translate = await getTranslations("Attendance.import");
  const translateClasses = await getTranslations("Classes");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: translateClasses("title"), href: "/classes" },
          { label: translate("breadcrumb") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {translate("title")}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{translate("cardTitle")}</CardTitle>
          <CardDescription>{translate("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-sm">
            <p className="mb-2 font-medium">{translate("columns")}</p>
            <ul className="text-muted-foreground list-disc pl-5 text-xs">
              <li>
                <code>Date</code> — {translate("dateLine")}
              </li>
              <li>
                <code>Course</code> — {translate("courseLine")}
              </li>
              <li>
                <code>Email</code> — {translate("studentLine")}
              </li>
              <li>
                <code>Status</code> — {translate("statusLine")}
              </li>
            </ul>
            <p className="text-muted-foreground mt-2 text-xs">
              {translate("note")}
            </p>
          </div>
          <AttendanceImportForm />
        </CardContent>
      </Card>
    </div>
  );
}

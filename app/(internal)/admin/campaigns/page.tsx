import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listCampaigns } from "@/lib/db/campaigns";
import { listAssignableLocations } from "@/lib/db/locations";
import { listDisciplines } from "@/lib/db/belts";
import { listCourseOptions } from "@/lib/db/courses";

import { CampaignComposer } from "./campaign-composer";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.campaigns");
  return { title: translate("metaTitle") };
}

export default async function AdminCampaignsPage() {
  await requirePermission(PERMISSIONS.COMMUNICATIONS_EDIT);
  const translate = await getTranslations("Admin.campaigns");
  const formatter = await getFormatter();
  const [locations, disciplines, courses, campaigns] = await Promise.all([
    listAssignableLocations(),
    listDisciplines(),
    listCourseOptions(),
    listCampaigns(),
  ]);

  const formatQueuedDate = (value: Date) =>
    formatter.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translate("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{translate("subtitle")}</p>
      </div>

      <CampaignComposer
        locations={locations.map((location) => ({
          id: location.id,
          name: location.name,
        }))}
        disciplines={disciplines.map((discipline) => ({
          id: discipline.id,
          name: discipline.name,
        }))}
        courses={courses.map((course) => ({
          id: course.id,
          name: course.name,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>{translate("recentTitle")}</CardTitle>
          <CardDescription>{translate("recentDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {translate("empty")}
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translate("columns.subject")}</TableHead>
                    <TableHead>{translate("columns.audience")}</TableHead>
                    <TableHead>{translate("columns.delivered")}</TableHead>
                    <TableHead>{translate("columns.status")}</TableHead>
                    <TableHead>{translate("columns.queued")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        {campaign.subject}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {campaign.audienceLabel}
                      </TableCell>
                      <TableCell className="text-sm">
                        {campaign.sentCount}/{campaign.recipientCount}
                        {campaign.failedCount > 0
                          ? ` · ${translate("failedCount", {
                              count: campaign.failedCount,
                            })}`
                          : ""}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            campaign.status === "SENT" ? "secondary" : "outline"
                          }
                        >
                          {campaign.status === "SENT"
                            ? translate("statuses.sent")
                            : campaign.status === "SENDING"
                              ? translate("statuses.sending")
                              : translate("statuses.queued")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatQueuedDate(campaign.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

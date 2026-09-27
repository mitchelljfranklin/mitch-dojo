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
import { formatDate } from "@/lib/utils";

import { CampaignComposer } from "./campaign-composer";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Campaigns" };

export default async function AdminCampaignsPage() {
  await requirePermission(PERMISSIONS.COMMUNICATIONS_EDIT);
  const [locations, disciplines, courses, campaigns] = await Promise.all([
    listAssignableLocations(),
    listDisciplines(),
    listCourseOptions(),
    listCampaigns(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground text-sm">
          Send a one-off email to a group. Queued campaigns are delivered by the
          scheduler within a few minutes.
        </p>
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
          <CardTitle>Recent campaigns</CardTitle>
          <CardDescription>
            Delivery is logged per recipient in the Email log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No campaigns sent yet.
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Queued</TableHead>
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
                          ? ` · ${campaign.failedCount} failed`
                          : ""}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            campaign.status === "SENT" ? "secondary" : "outline"
                          }
                        >
                          {campaign.status === "SENT"
                            ? "Sent"
                            : campaign.status === "SENDING"
                              ? "Sending"
                              : "Queued"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(campaign.createdAt)}
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

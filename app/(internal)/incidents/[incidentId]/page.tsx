import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import {
  deleteIncidentAction,
  setIncidentStatusAction,
} from "@/lib/actions/incidents";
import { getIncidentDetail, listIncidentFormOptions } from "@/lib/db/incidents";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

import { IncidentEditForm } from "./incident-edit-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Incidents.detail");
  return { title: translate("metaTitle") };
}

type IncidentDetailPageProps = {
  params: Promise<{ incidentId: string }>;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm whitespace-pre-wrap">{value}</span>
    </div>
  );
}

export default async function IncidentDetailPage({
  params,
}: IncidentDetailPageProps) {
  const user = await requirePermission(PERMISSIONS.INCIDENTS_VIEW);
  const canManage = hasPermission(
    user.permissions,
    PERMISSIONS.INCIDENTS_MANAGE,
  );
  const { incidentId } = await params;
  const translate = await getTranslations("Incidents.detail");
  const translateIncidents = await getTranslations("Incidents");
  const formatter = await getFormatter();
  const formatDate = (value: Date) =>
    formatter.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  const incident = await getIncidentDetail(incidentId);
  if (!incident) notFound();

  const options = canManage ? await listIncidentFormOptions() : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {incident.title}
            </h1>
            <Badge
              variant={
                incident.severity === "SERIOUS"
                  ? "destructive"
                  : incident.severity === "MODERATE"
                    ? "secondary"
                    : "outline"
              }
            >
              {translateIncidents(`severity.${incident.severity}`)}
            </Badge>
            <Badge variant={incident.status === "OPEN" ? "default" : "outline"}>
              {translateIncidents(`status.${incident.status}`)}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatDate(incident.occurredAt)}
            {incident.studentName ? ` · ${incident.studentName}` : ""}
            {incident.locationName ? ` · ${incident.locationName}` : ""}
            {incident.reportedByName
              ? ` · ${translate("reportedBy", {
                  name: incident.reportedByName,
                })}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/incidents">{translate("back")}</Link>
          </Button>
          {canManage ? (
            <form action={setIncidentStatusAction}>
              <input type="hidden" name="incidentId" value={incident.id} />
              <input
                type="hidden"
                name="status"
                value={incident.status === "OPEN" ? "CLOSED" : "OPEN"}
              />
              <Button type="submit" variant="outline">
                {incident.status === "OPEN"
                  ? translate("close")
                  : translate("reopen")}
              </Button>
            </form>
          ) : null}
          {canManage ? (
            <form action={deleteIncidentAction} id="delete-incident-form">
              <input type="hidden" name="incidentId" value={incident.id} />
              <ConfirmDialog
                title={translate("deleteTitle")}
                description={translate("deleteDescription")}
                confirmLabel={translate("delete")}
                formId="delete-incident-form"
              >
                <Button type="button" variant="destructive">
                  {translate("delete")}
                </Button>
              </ConfirmDialog>
            </form>
          ) : null}
        </div>
      </div>

      {canManage && options ? (
        <Card>
          <CardHeader>
            <CardTitle>{translate("editTitle")}</CardTitle>
            <CardDescription>
              {incident.closedAt
                ? translate("closed", {
                    date: formatDate(incident.closedAt),
                  })
                : translate("auditHint")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IncidentEditForm
              incidentId={incident.id}
              title={incident.title}
              occurredAt={incident.occurredAt.toISOString().slice(0, 10)}
              severity={incident.severity}
              description={incident.description}
              injuryDescription={incident.injuryDescription ?? ""}
              treatmentGiven={incident.treatmentGiven ?? ""}
              medicalAttentionRequired={incident.medicalAttentionRequired}
              actionsTaken={incident.actionsTaken ?? ""}
              studentId={incident.studentId ?? ""}
              locationId={incident.locationId ?? ""}
              students={options.students}
              locations={options.locations}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{translate("reportTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <DetailRow label={translate("what")} value={incident.description} />
            {incident.injuryDescription ? (
              <DetailRow
                label={translate("injury")}
                value={incident.injuryDescription}
              />
            ) : null}
            {incident.treatmentGiven ? (
              <DetailRow
                label={translate("treatment")}
                value={incident.treatmentGiven}
              />
            ) : null}
            <DetailRow
              label={translate("medical")}
              value={
                incident.medicalAttentionRequired
                  ? translate("yes")
                  : translate("no")
              }
            />
            {incident.actionsTaken ? (
              <DetailRow
                label={translate("actions")}
                value={incident.actionsTaken}
              />
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

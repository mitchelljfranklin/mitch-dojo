import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FlashToast } from "@/components/flash-toast";
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
import { INCIDENT_SEVERITY_LABELS } from "@/lib/schemas/incident";
import { formatDateUtc } from "@/lib/utils";

import { IncidentEditForm } from "./incident-edit-form";

export const dynamic = "force-dynamic";

type IncidentDetailPageProps = {
  params: Promise<{ incidentId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
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
  searchParams,
}: IncidentDetailPageProps) {
  const user = await requirePermission(PERMISSIONS.INCIDENTS_VIEW);
  const canManage = hasPermission(
    user.permissions,
    PERMISSIONS.INCIDENTS_MANAGE,
  );
  const { incidentId } = await params;
  const sp = await searchParams;

  const incident = await getIncidentDetail(incidentId);
  if (!incident) notFound();

  const options = canManage ? await listIncidentFormOptions() : null;

  return (
    <div className="flex flex-col gap-6">
      {sp.created === "1" ? (
        <FlashToast message="Incident logged." variant="success" />
      ) : null}

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
              {INCIDENT_SEVERITY_LABELS[incident.severity]}
            </Badge>
            <Badge variant={incident.status === "OPEN" ? "default" : "outline"}>
              {incident.status === "OPEN" ? "Open" : "Closed"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatDateUtc(incident.occurredAt)}
            {incident.studentName ? ` · ${incident.studentName}` : ""}
            {incident.locationName ? ` · ${incident.locationName}` : ""}
            {incident.reportedByName
              ? ` · reported by ${incident.reportedByName}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/incidents">Back to list</Link>
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
                {incident.status === "OPEN" ? "Close incident" : "Reopen"}
              </Button>
            </form>
          ) : null}
          {canManage ? (
            <form action={deleteIncidentAction} id="delete-incident-form">
              <input type="hidden" name="incidentId" value={incident.id} />
              <ConfirmDialog
                title="Delete this incident report?"
                description="This permanently removes the report from the accident book. This cannot be undone."
                formId="delete-incident-form"
              >
                <Button type="button" variant="destructive">
                  Delete
                </Button>
              </ConfirmDialog>
            </form>
          ) : null}
        </div>
      </div>

      {canManage && options ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit report</CardTitle>
            <CardDescription>
              {incident.closedAt
                ? `Closed ${formatDateUtc(incident.closedAt)}.`
                : "Updates are audit-logged."}
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
            <CardTitle>Report</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <DetailRow label="What happened" value={incident.description} />
            {incident.injuryDescription ? (
              <DetailRow label="Injury" value={incident.injuryDescription} />
            ) : null}
            {incident.treatmentGiven ? (
              <DetailRow
                label="Treatment given"
                value={incident.treatmentGiven}
              />
            ) : null}
            <DetailRow
              label="Medical attention required"
              value={incident.medicalAttentionRequired ? "Yes" : "No"}
            />
            {incident.actionsTaken ? (
              <DetailRow label="Actions taken" value={incident.actionsTaken} />
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { ActionForm } from "@/components/action-form";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  type IncidentActionState,
  updateIncidentAction,
} from "@/lib/actions/incidents";
import {
  INCIDENT_NONE,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
} from "@/lib/schemas/incident";

type Option = { id: string; name: string };

export function IncidentEditForm({
  incidentId,
  title,
  occurredAt,
  severity,
  description,
  injuryDescription,
  treatmentGiven,
  medicalAttentionRequired,
  actionsTaken,
  studentId,
  locationId,
  students,
  locations,
}: {
  incidentId: string;
  title: string;
  occurredAt: string;
  severity: string;
  description: string;
  injuryDescription: string;
  treatmentGiven: string;
  medicalAttentionRequired: boolean;
  actionsTaken: string;
  studentId: string;
  locationId: string;
  students: Option[];
  locations: Option[];
}) {
  const [state, formAction, isPending] = useActionState<
    IncidentActionState,
    FormData
  >(updateIncidentAction, undefined);
  useActionFeedback(state);

  return (
    <ActionForm action={formAction} className="grid gap-4">
      <input type="hidden" name="incidentId" value={incidentId} />
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          defaultValue={title}
          required
          maxLength={120}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="occurredAt">Date</Label>
          <Input
            id="occurredAt"
            name="occurredAt"
            type="date"
            defaultValue={occurredAt}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="severity">Severity</Label>
          <Select name="severity" defaultValue={severity}>
            <SelectTrigger id="severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INCIDENT_SEVERITIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {INCIDENT_SEVERITY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="studentId">Student (optional)</Label>
          <Select name="studentId" defaultValue={studentId || INCIDENT_NONE}>
            <SelectTrigger id="studentId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={INCIDENT_NONE}>No student</SelectItem>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="locationId">Location (optional)</Label>
          <Select name="locationId" defaultValue={locationId || INCIDENT_NONE}>
            <SelectTrigger id="locationId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={INCIDENT_NONE}>No location</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">What happened</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={description}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="injuryDescription">Injury (optional)</Label>
        <Textarea
          id="injuryDescription"
          name="injuryDescription"
          rows={2}
          defaultValue={injuryDescription}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="treatmentGiven">Treatment given (optional)</Label>
          <Input
            id="treatmentGiven"
            name="treatmentGiven"
            defaultValue={treatmentGiven}
          />
        </div>
        <label className="flex w-fit items-center gap-2 self-end text-sm">
          <Checkbox
            name="medicalAttentionRequired"
            defaultChecked={medicalAttentionRequired}
          />
          Medical attention was required
        </label>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="actionsTaken">Actions taken (optional)</Label>
        <Textarea
          id="actionsTaken"
          name="actionsTaken"
          rows={2}
          defaultValue={actionsTaken}
        />
      </div>
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </ActionForm>
  );
}

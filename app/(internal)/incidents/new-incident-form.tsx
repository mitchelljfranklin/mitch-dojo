"use client";

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
import {
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
} from "@/lib/schemas/incident";

import { createIncidentAction } from "@/lib/actions/incidents";

export const INCIDENT_NONE = "none";

type Option = { id: string; name: string };

export function NewIncidentForm({
  students,
  locations,
}: {
  students: Option[];
  locations: Option[];
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={createIncidentAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          placeholder="e.g. Ankle sprain during sparring"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="occurredAt">Date</Label>
          <Input
            id="occurredAt"
            name="occurredAt"
            type="date"
            required
            defaultValue={today}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="severity">Severity</Label>
          <Select name="severity" defaultValue="MINOR">
            <SelectTrigger id="severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INCIDENT_SEVERITIES.map((severity) => (
                <SelectItem key={severity} value={severity}>
                  {INCIDENT_SEVERITY_LABELS[severity]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="studentId">Student (optional)</Label>
          <Select name="studentId" defaultValue={INCIDENT_NONE}>
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
          <Select name="locationId" defaultValue={INCIDENT_NONE}>
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
        <Textarea id="description" name="description" rows={4} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="injuryDescription">Injury (optional)</Label>
        <Textarea id="injuryDescription" name="injuryDescription" rows={2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="treatmentGiven">Treatment given (optional)</Label>
          <Input id="treatmentGiven" name="treatmentGiven" />
        </div>
        <label className="flex w-fit items-center gap-2 self-end text-sm">
          <Checkbox name="medicalAttentionRequired" />
          Medical attention was required
        </label>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="actionsTaken">Actions taken (optional)</Label>
        <Textarea id="actionsTaken" name="actionsTaken" rows={2} />
      </div>
      <div>
        <Button type="submit">Log incident</Button>
      </div>
    </form>
  );
}

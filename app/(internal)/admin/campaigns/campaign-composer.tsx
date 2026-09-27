"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  createCampaignAction,
  type CampaignActionState,
} from "@/lib/actions/campaigns";

type Option = { id: string; name: string };

type CampaignComposerProps = {
  locations: Option[];
  disciplines: Option[];
  courses: Option[];
};

const AUDIENCE_OPTIONS = [
  { value: "ALL", label: "All active members" },
  { value: "LOCATION", label: "Members at a location" },
  { value: "DISCIPLINE", label: "Members training a discipline" },
  { value: "COURSE", label: "Members in a course" },
  { value: "OVERDUE", label: "Members with an overdue balance" },
];

export function CampaignComposer({
  locations,
  disciplines,
  courses,
}: CampaignComposerProps) {
  const [state, formAction, isPending] = useActionState<
    CampaignActionState,
    FormData
  >(createCampaignAction, undefined);
  useActionFeedback(state);

  const [audience, setAudience] = useState("ALL");
  const refOptions =
    audience === "LOCATION"
      ? locations
      : audience === "DISCIPLINE"
        ? disciplines
        : audience === "COURSE"
          ? courses
          : [];
  const needsRef = refOptions.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compose a message</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex max-w-2xl flex-col gap-4">
          <input type="hidden" name="audienceType" value={audience} />
          <div className="grid gap-2">
            <Label htmlFor="campaign-subject">Subject</Label>
            <Input
              id="campaign-subject"
              name="subject"
              required
              maxLength={150}
              placeholder="e.g. Dojo closed this Saturday"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="campaign-audience">Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger id="campaign-audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsRef ? (
            <div className="grid gap-2">
              <Label htmlFor="campaign-ref">Target</Label>
              <select
                id="campaign-ref"
                name="audienceRefId"
                required
                defaultValue=""
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {refOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="campaign-body">Message</Label>
            <Textarea
              id="campaign-body"
              name="body"
              rows={6}
              required
              maxLength={5000}
              placeholder="Markdown supported."
            />
            <p className="text-muted-foreground text-xs">
              Sent to each member&apos;s email, falling back to their guardian.
              Duplicates are removed automatically.
            </p>
          </div>
          {state && "error" in state ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
          {state && "ok" in state && state.ok ? (
            <p className="text-success text-sm" role="status">
              {state.message}
            </p>
          ) : null}
          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Queueing..." : "Queue campaign"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

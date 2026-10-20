"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

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

const AUDIENCE_VALUES = [
  "ALL",
  "LOCATION",
  "DISCIPLINE",
  "COURSE",
  "OVERDUE",
] as const;

export function CampaignComposer({
  locations,
  disciplines,
  courses,
}: CampaignComposerProps) {
  const translate = useTranslations("Admin.campaigns");
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
        <CardTitle>{translate("composerTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex max-w-2xl flex-col gap-4">
          <input type="hidden" name="audienceType" value={audience} />
          <div className="grid gap-2">
            <Label htmlFor="campaign-subject">{translate("subject")}</Label>
            <Input
              id="campaign-subject"
              name="subject"
              required
              maxLength={150}
              placeholder={translate("subjectPlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="campaign-audience">{translate("audience")}</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger id="campaign-audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {translate(`audiences.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsRef ? (
            <div className="grid gap-2">
              <Label htmlFor="campaign-ref">{translate("target")}</Label>
              <select
                id="campaign-ref"
                name="audienceRefId"
                required
                defaultValue=""
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="" disabled>
                  {translate("choose")}
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
            <Label htmlFor="campaign-body">{translate("message")}</Label>
            <Textarea
              id="campaign-body"
              name="body"
              rows={6}
              required
              maxLength={5000}
              placeholder={translate("messagePlaceholder")}
            />
            <p className="text-muted-foreground text-xs">
              {translate("messageHint")}
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
              {isPending ? translate("queueing") : translate("queue")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

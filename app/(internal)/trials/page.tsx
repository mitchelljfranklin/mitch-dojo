import Link from "next/link";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Breadcrumbs } from "@/components/breadcrumbs";
import { StatCard } from "@/components/stat-card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import {
  listTrials,
  TRIAL_STAGE_TRANSITIONS,
  type TrialStageValue,
} from "@/lib/db/trials";
import { setTrialStageAction } from "@/lib/actions/trials";
import { listActivePlansForSelection } from "@/lib/db/memberships";
import { getMembershipsSettings } from "@/lib/settings";
import { ConvertTrialSheet } from "./convert-trial-sheet";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Trials");
  return { title: translate("metaTitle") };
}

// Pipeline order: active stages first, closed at the bottom.
const STAGE_ORDER: TrialStageValue[] = [
  "NEW",
  "CONTACTED",
  "FIRST_CLASS",
  "CONVERTED",
  "LOST",
];

function stageBadgeVariant(stage: TrialStageValue) {
  if (stage === "CONVERTED") return "secondary" as const;
  if (stage === "LOST") return "outline" as const;
  return "default" as const;
}

type TrialsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function TrialsPage({ searchParams }: TrialsPageProps) {
  const user = await requirePermission(PERMISSIONS.STUDENTS_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.STUDENTS_EDIT);
  const canBill = hasPermission(user.permissions, PERMISSIONS.MEMBERSHIPS_EDIT);
  const query = await searchParams;
  const translate = await getTranslations("Trials");
  const formatter = await getFormatter();
  const { currency } = await getMembershipsSettings();
  const stageFilter = STAGE_ORDER.find((stage) => stage === query.stage);

  const { rows, convertedThisMonth, lostCount } = await listTrials();
  const plans = canBill ? await listActivePlansForSelection() : [];
  // Default view: the open pipeline. CONVERTED/LOST leads appear via their
  // stage filters.
  const visible = stageFilter
    ? rows.filter((row) => row.stage === stageFilter)
    : rows.filter((row) => row.stage !== "CONVERTED" && row.stage !== "LOST");

  const openTrials = rows.filter(
    (row) => row.stage !== "CONVERTED" && row.stage !== "LOST",
  ).length;
  const closed = convertedThisMonth + lostCount;
  const conversionRate =
    closed > 0 ? Math.round((convertedThisMonth / closed) * 100) : null;
  const formatDate = (value: Date) =>
    formatter.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs segments={[{ label: translate("title") }]} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translate("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translate("subtitle")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/book" target="_blank">
            {translate("actions.openBooking")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={translate("stats.open")} value={openTrials} />
        <StatCard
          label={translate("stats.converted")}
          value={convertedThisMonth}
        />
        <StatCard
          label={translate("stats.conversionRate")}
          value={conversionRate ?? 0}
          format={conversionRate === null ? "number" : "percent"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/trials">
          <Badge variant={stageFilter ? "outline" : "default"}>
            {translate("filters.all")}
          </Badge>
        </Link>
        {STAGE_ORDER.map((stage) => (
          <Link key={stage} href={`/trials?stage=${stage}`}>
            <Badge variant={stageFilter === stage ? "default" : "outline"}>
              {translate(`stages.${stage}`)}
            </Badge>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translate("pipeline.title")}</CardTitle>
          <CardDescription>
            {lostCount > 0
              ? translate("pipeline.lost", { count: lostCount })
              : translate("pipeline.noLost")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {visible.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {translate("pipeline.empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate("pipeline.lead")}</TableHead>
                  <TableHead>{translate("pipeline.stage")}</TableHead>
                  <TableHead>{translate("pipeline.inTrial")}</TableHead>
                  <TableHead>{translate("pipeline.lastClass")}</TableHead>
                  <TableHead>{translate("pipeline.contact")}</TableHead>
                  {canEdit ? (
                    <TableHead>{translate("pipeline.moveTo")}</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((trial) => (
                  <TableRow key={trial.studentId}>
                    <TableCell>
                      <Link
                        href={`/students/${trial.studentId}`}
                        className="font-medium hover:underline"
                      >
                        {trial.name}
                      </Link>
                      <div className="text-muted-foreground text-xs">
                        {trial.locationNames.join(", ") ||
                          translate("pipeline.noLocation")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={stageBadgeVariant(trial.stage)}>
                        {translate(`stages.${trial.stage}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {translate("pipeline.days", {
                        count: trial.daysInTrial,
                      })}
                    </TableCell>
                    <TableCell>
                      {trial.lastAttendedAt
                        ? formatDate(trial.lastAttendedAt)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {trial.email ?? trial.phone ?? "—"}
                    </TableCell>
                    {canEdit ? (
                      <TableCell>
                        {TRIAL_STAGE_TRANSITIONS[trial.stage].length === 0 ? (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <form
                              action={setTrialStageAction}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="hidden"
                                name="studentId"
                                value={trial.studentId}
                              />
                              <select
                                name="stage"
                                defaultValue=""
                                required
                                className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                              >
                                <option value="" disabled>
                                  {translate("pipeline.movePlaceholder")}
                                </option>
                                {TRIAL_STAGE_TRANSITIONS[trial.stage].map(
                                  (stage) => (
                                    <option key={stage} value={stage}>
                                      {translate(`stages.${stage}`)}
                                    </option>
                                  ),
                                )}
                              </select>
                              <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs"
                              >
                                {translate("pipeline.apply")}
                              </Button>
                            </form>
                            {TRIAL_STAGE_TRANSITIONS[trial.stage].includes(
                              "CONVERTED",
                            ) ? (
                              <ConvertTrialSheet
                                studentId={trial.studentId}
                                studentName={trial.name}
                                plans={plans}
                                canBill={canBill}
                                currency={currency}
                              />
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";

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
import { ConvertTrialSheet } from "./convert-trial-sheet";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Trials" };

const STAGE_LABELS: Record<TrialStageValue, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  FIRST_CLASS: "First class",
  CONVERTED: "Converted",
  LOST: "Lost",
};

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

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs segments={[{ label: "Trials" }]} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trials</h1>
          <p className="text-muted-foreground text-sm">
            Trial pipeline — move leads through contact, first class, and
            conversion.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/book" target="_blank">
            Open booking page
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open trials" value={openTrials} />
        <StatCard label="Converted this month" value={convertedThisMonth} />
        <StatCard
          label="Conversion rate"
          value={conversionRate ?? 0}
          format={conversionRate === null ? "number" : "percent"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/trials">
          <Badge variant={stageFilter ? "outline" : "default"}>All</Badge>
        </Link>
        {STAGE_ORDER.map((stage) => (
          <Link key={stage} href={`/trials?stage=${stage}`}>
            <Badge variant={stageFilter === stage ? "default" : "outline"}>
              {STAGE_LABELS[stage]}
            </Badge>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
          <CardDescription>
            {lostCount > 0
              ? `${lostCount} lost trial${lostCount === 1 ? "" : "s"} on record.`
              : "No lost trials on record."}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {visible.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No trials in this view yet. Website bookings land here as
              &quot;New&quot;.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>In trial</TableHead>
                  <TableHead>Last class</TableHead>
                  <TableHead>Contact</TableHead>
                  {canEdit ? <TableHead>Move to</TableHead> : null}
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
                        {trial.locationNames.join(", ") || "No location"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={stageBadgeVariant(trial.stage)}>
                        {STAGE_LABELS[trial.stage]}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {trial.daysInTrial}d
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
                                  Move to…
                                </option>
                                {TRIAL_STAGE_TRANSITIONS[trial.stage].map(
                                  (stage) => (
                                    <option key={stage} value={stage}>
                                      {STAGE_LABELS[stage]}
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
                                Apply
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

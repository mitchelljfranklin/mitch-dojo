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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FlashToast } from "@/components/flash-toast";
import { PlanFormSheet } from "./plan-form-sheet";
import { GenerateInvoicesButton } from "./generate-invoices-button";
import {
  deleteMembershipPlanAction,
  toggleMembershipPlanActiveAction,
} from "@/lib/actions/memberships";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listMembershipPlans } from "@/lib/db/memberships";
import { getMembershipsSettings } from "@/lib/settings";
import type { BillingPeriod } from "@/lib/schemas/membership";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Memberships");
  return { title: translate("metaTitle") };
}

type MembershipsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function MembershipsPage({
  searchParams,
}: MembershipsPageProps) {
  const user = await requirePermission(PERMISSIONS.MEMBERSHIPS_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.MEMBERSHIPS_EDIT);
  const plans = await listMembershipPlans();
  const { currency } = await getMembershipsSettings();
  const query = await searchParams;
  const translate = await getTranslations("Memberships");
  const formatter = await getFormatter();
  const money = (cents: number) => {
    try {
      return formatter.number(cents / 100, { style: "currency", currency });
    } catch {
      return `${(cents / 100).toFixed(2)} ${currency}`;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs segments={[{ label: translate("title") }]} />
      {query.planError ? (
        <FlashToast variant="error" message={query.planError} />
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translate("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translate("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/memberships/invoices">
              {translate("actions.invoices")}
            </Link>
          </Button>
          {canEdit ? (
            <Button asChild variant="outline">
              <Link href="/memberships/import">
                {translate("actions.import")}
              </Link>
            </Button>
          ) : null}
          {canEdit ? <GenerateInvoicesButton /> : null}
          {canEdit ? <PlanFormSheet mode="create" currency={currency} /> : null}
        </div>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{translate("empty.title")}</CardTitle>
            <CardDescription>{translate("empty.description")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate("table.plan")}</TableHead>
                  <TableHead>{translate("table.type")}</TableHead>
                  <TableHead>{translate("table.price")}</TableHead>
                  <TableHead>{translate("table.activeMembers")}</TableHead>
                  {canEdit ? (
                    <TableHead className="w-40">
                      {translate("table.actions")}
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.name}</span>
                        {plan.planType === "RECURRING" &&
                        plan.chargeOnlyWithAttendance ? (
                          <Badge
                            variant="outline"
                            className="text-xs"
                            title={translate("planType.attendanceGatedHint")}
                          >
                            {translate("planType.attendanceGated")}
                          </Badge>
                        ) : null}
                      </div>
                      {plan.description ? (
                        <div className="text-muted-foreground max-w-md truncate text-xs">
                          {plan.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {plan.planType === "RECURRING" ? (
                        <Badge variant="secondary">
                          {translate("planType.recurring")} ·{" "}
                          {translate(
                            `billingPeriod.${plan.billingPeriod as BillingPeriod}`,
                          )}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {translate("planType.oneOff")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{money(plan.priceCents)}</TableCell>
                    <TableCell>{plan._count.enrollments}</TableCell>
                    {canEdit ? (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <PlanFormSheet
                            mode="edit"
                            currency={currency}
                            plan={{
                              id: plan.id,
                              name: plan.name,
                              description: plan.description ?? "",
                              planType: plan.planType,
                              billingPeriod: plan.billingPeriod,
                              price: (plan.priceCents / 100).toFixed(2),
                              isActive: plan.isActive,
                              chargeOnlyWithAttendance:
                                plan.chargeOnlyWithAttendance,
                            }}
                          />
                          <form
                            id={`toggle-plan-${plan.id}`}
                            action={toggleMembershipPlanActiveAction}
                          >
                            <input
                              type="hidden"
                              name="planId"
                              value={plan.id}
                            />
                            <input
                              type="hidden"
                              name="isActive"
                              value={plan.isActive ? "false" : "true"}
                            />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                            >
                              {plan.isActive
                                ? translate("row.deactivate")
                                : translate("row.activate")}
                            </Button>
                          </form>
                          <form
                            id={`delete-plan-${plan.id}`}
                            action={deleteMembershipPlanAction}
                          >
                            <input
                              type="hidden"
                              name="planId"
                              value={plan.id}
                            />
                            <ConfirmDialog
                              title={translate("row.deleteTitle", {
                                name: plan.name,
                              })}
                              description={translate("row.deleteDescription")}
                              confirmLabel={translate("row.delete")}
                              formId={`delete-plan-${plan.id}`}
                            >
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-destructive h-8 px-2 text-xs"
                              >
                                {translate("row.delete")}
                              </Button>
                            </ConfirmDialog>
                          </form>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

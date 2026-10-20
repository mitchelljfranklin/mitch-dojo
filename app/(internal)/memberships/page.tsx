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
import {
  BILLING_PERIOD_LABELS,
  type BillingPeriod,
} from "@/lib/schemas/membership";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Memberships" };

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

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs segments={[{ label: "Memberships" }]} />
      {query.planError ? (
        <FlashToast variant="error" message={query.planError} />
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Memberships</h1>
          <p className="text-muted-foreground text-sm">
            Plans members subscribe to. School-wide — one membership covers all
            of a student&apos;s training.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/memberships/invoices">Invoices</Link>
          </Button>
          {canEdit ? (
            <Button asChild variant="outline">
              <Link href="/memberships/import">Import</Link>
            </Button>
          ) : null}
          {canEdit ? <GenerateInvoicesButton /> : null}
          {canEdit ? <PlanFormSheet mode="create" currency={currency} /> : null}
        </div>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No plans yet</CardTitle>
            <CardDescription>
              Create recurring memberships (e.g. &quot;Monthly training&quot;)
              or one-off items (e.g. grading fees).
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Active members</TableHead>
                  {canEdit ? (
                    <TableHead className="w-40">Actions</TableHead>
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
                            title="Recurring invoices generate only when the member has trained since the previous invoice"
                          >
                            Attendance-gated
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
                          Recurring ·{" "}
                          {BILLING_PERIOD_LABELS[
                            plan.billingPeriod as BillingPeriod
                          ] ?? plan.billingPeriod}
                        </Badge>
                      ) : (
                        <Badge variant="outline">One-off</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatMoney(plan.priceCents, currency)}
                    </TableCell>
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
                              {plan.isActive ? "Deactivate" : "Activate"}
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
                              title={`Delete ${plan.name}?`}
                              description="The plan will be permanently removed. Plans with enrollments cannot be deleted."
                              confirmLabel="Delete"
                              formId={`delete-plan-${plan.id}`}
                            >
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-destructive h-8 px-2 text-xs"
                              >
                                Delete
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

import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { deleteHouseholdAction } from "@/lib/actions/households";
import { listHouseholds } from "@/lib/db/households";

import { CreateHouseholdSheet } from "./create-household-form";
import { SendPortalLinkButton } from "./send-portal-link-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Households" };

export default async function HouseholdsPage() {
  const user = await requirePermission(PERMISSIONS.STUDENTS_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.STUDENTS_EDIT);
  const households = await listHouseholds();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Students", href: "/students" },
          { label: "Households" },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Households</h1>
          <p className="text-muted-foreground text-sm">
            Group siblings under one family contact. Assign a student to a
            household from their record (edit form).
          </p>
        </div>
        {canEdit ? <CreateHouseholdSheet /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All households</CardTitle>
          <CardDescription>
            Sibling contact is inherited when a student joins a household.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {households.length === 0 ? (
            <p className="text-muted-foreground text-sm">No households yet.</p>
          ) : (
            households.map((household) => (
              <div
                key={household.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{household.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {[
                      household.contactName,
                      household.contactEmail,
                      household.contactPhone,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No contact details"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {household.members.length} member
                    {household.members.length === 1 ? "" : "s"}
                    {household.members.length > 0
                      ? `: ${household.members.map((member) => `${member.firstName} ${member.lastName}`).join(", ")}`
                      : ""}
                  </span>
                </div>
                {canEdit ? (
                  <div className="flex items-center gap-2">
                    <SendPortalLinkButton householdId={household.id} />
                    <form
                      id={`delete-household-${household.id}`}
                      action={deleteHouseholdAction}
                    >
                      <input
                        type="hidden"
                        name="householdId"
                        value={household.id}
                      />
                      <ConfirmDialog
                        title="Delete household?"
                        description={`${household.name} will be removed. Members keep their student records.`}
                        confirmLabel="Delete"
                        formId={`delete-household-${household.id}`}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                        >
                          Delete
                        </Button>
                      </ConfirmDialog>
                    </form>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Tip: assign a student to a household from their{" "}
        <Link href="/students" className="hover:underline">
          record
        </Link>
        &apos;s Edit form.
      </p>
    </div>
  );
}

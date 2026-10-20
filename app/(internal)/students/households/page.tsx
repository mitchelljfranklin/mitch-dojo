import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

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
import { EditHouseholdSheet } from "./edit-household-sheet";
import { SendPortalLinkButton } from "./send-portal-link-button";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Students.households");
  return { title: translate("metaTitle") };
}

export default async function HouseholdsPage() {
  const user = await requirePermission(PERMISSIONS.STUDENTS_VIEW);
  const translate = await getTranslations("Students.households");
  const translateStudents = await getTranslations("Students");
  const canEdit = hasPermission(user.permissions, PERMISSIONS.STUDENTS_EDIT);
  const households = await listHouseholds();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: translateStudents("title"), href: "/students" },
          { label: translate("title") },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translate("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translate("subtitle")}
          </p>
        </div>
        {canEdit ? <CreateHouseholdSheet /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translate("allTitle")}</CardTitle>
          <CardDescription>{translate("allDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {households.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {translate("empty")}
            </p>
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
                      .join(" · ") || translate("noContact")}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {translate("members", { count: household.members.length })}
                    {household.members.length > 0
                      ? `: ${household.members.map((member) => `${member.firstName} ${member.lastName}`).join(", ")}`
                      : ""}
                  </span>
                </div>
                {canEdit ? (
                  <div className="flex items-center gap-2">
                    <EditHouseholdSheet
                      household={{
                        id: household.id,
                        name: household.name,
                        contactName: household.contactName,
                        contactEmail: household.contactEmail,
                        contactPhone: household.contactPhone,
                      }}
                    />
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
                        title={translate("deleteTitle")}
                        description={translate("deleteDescription", {
                          name: household.name,
                        })}
                        confirmLabel={translate("delete")}
                        formId={`delete-household-${household.id}`}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                        >
                          {translate("delete")}
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
        {translate("tipBefore")}{" "}
        <Link href="/students" className="hover:underline">
          {translate("tipLink")}
        </Link>
        {translate("tipAfter")}
      </p>
    </div>
  );
}

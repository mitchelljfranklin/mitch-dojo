import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FlashToast } from "@/components/flash-toast";
import { Pagination } from "@/components/pagination";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { SearchInput } from "@/components/search-input";
import { NewInvoiceSheet } from "./new-invoice-sheet";
import { InvoicesTable, type InvoiceRowView } from "./invoices-table";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import {
  listInvoices,
  listActivePlansForSelection,
} from "@/lib/db/memberships";
import { prisma } from "@/lib/prisma";
import { getMembershipsSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Memberships.invoices");
  return { title: translate("metaTitle") };
}

type InvoicesPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const user = await requirePermission(PERMISSIONS.MEMBERSHIPS_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.MEMBERSHIPS_EDIT);
  const { currency } = await getMembershipsSettings();
  const translate = await getTranslations("Memberships.invoices");
  const translateMemberships = await getTranslations("Memberships");

  const query = await searchParams;
  const statusFilter =
    query.status === "OPEN" ||
    query.status === "PAID" ||
    query.status === "VOID"
      ? query.status
      : undefined;
  const overdueOnly = query.status === "OVERDUE";
  const studentId = query.studentId;
  const search = query.q?.trim() ?? "";
  const locationFilter =
    query.location && query.location !== "ALL" ? query.location : undefined;
  const page = Math.max(1, Number(query.page ?? "1") || 1);

  const { rows, total } = await listInvoices(
    {
      status: overdueOnly ? undefined : statusFilter,
      overdueOnly,
      studentId,
      studentName: search,
      locationId: locationFilter,
    },
    page,
  );

  const rowsView: InvoiceRowView[] = rows.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    studentId: invoice.student.id,
    studentName: `${invoice.student.firstName} ${invoice.student.lastName}`,
    locationName: invoice.location?.name ?? null,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    status: invoice.status,
    isOverdue: invoice.isOverdue,
    totalCents: invoice.financials.totalCents,
    balanceCents: invoice.financials.balanceCents,
  }));

  const [invoiceStudents, invoicePlans, invoiceLocations] = await Promise.all([
    canEdit
      ? prisma.student.findMany({
          where: { status: { in: ["ACTIVE", "TRIAL"] } },
          select: { id: true, firstName: true, lastName: true },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        })
      : Promise.resolve([]),
    canEdit ? listActivePlansForSelection() : Promise.resolve([]),
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: translateMemberships("title"), href: "/memberships" },
          { label: translate("title") },
        ]}
      />
      {query.invoiceError ? (
        <FlashToast variant="error" message={query.invoiceError} />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translate("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translate("subtitle", { count: total })}
          </p>
        </div>
        {canEdit ? (
          <NewInvoiceSheet
            currency={currency}
            students={invoiceStudents}
            plans={invoicePlans}
            locations={invoiceLocations}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder={translate("filters.searchPlaceholder")}
          paramName="q"
        />
        <form className="flex flex-wrap items-center gap-3">
          {search ? <input type="hidden" name="q" value={search} /> : null}
          <div className="w-40">
            <AutoSubmitSelect
              key={`status-${query.status ?? "ALL"}`}
              name="status"
              defaultValue={query.status ?? "ALL"}
              ariaLabel={translate("filters.statusAria")}
              options={[
                { value: "ALL", label: translate("filters.allStatuses") },
                { value: "OPEN", label: translate("filters.open") },
                { value: "OVERDUE", label: translate("filters.overdue") },
                { value: "PAID", label: translate("filters.paid") },
                { value: "VOID", label: translate("filters.void") },
              ]}
            />
          </div>
          <div className="w-44">
            <AutoSubmitSelect
              key={`location-${locationFilter ?? "ALL"}`}
              name="location"
              defaultValue={locationFilter ?? "ALL"}
              ariaLabel={translate("filters.locationAria")}
              options={[
                { value: "ALL", label: translate("filters.allLocations") },
                ...invoiceLocations.map((location) => ({
                  value: location.id,
                  label: location.name,
                })),
              ]}
            />
          </div>
        </form>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            {translate("empty")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0">
            <InvoicesTable
              rows={rowsView}
              currency={currency}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
      )}

      <Pagination page={page} pageSize={25} totalCount={total} />
    </div>
  );
}

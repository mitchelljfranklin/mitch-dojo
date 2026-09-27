import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getRevenueReport } from "@/lib/db/reports";
import { csvEscape } from "@/lib/utils";

const COLUMNS = [
  "Section",
  "Plan",
  "BillingPeriod",
  "Payments",
  "CollectedCents",
  "ActiveEnrollments",
  "MonthlyEstimateCents",
];

export async function GET() {
  await requirePermission(PERMISSIONS.ANALYTICS_VIEW);

  const report = await getRevenueReport(6);
  const lines = [COLUMNS.join(",")];

  for (const row of report.byPlan) {
    lines.push(
      ["Collected", row.planName, "", row.payments, row.collectedCents, "", ""]
        .map(csvEscape)
        .join(","),
    );
  }
  for (const row of report.recurring.byPlan) {
    lines.push(
      [
        "Recurring",
        row.planName,
        row.billingPeriod ?? "",
        "",
        "",
        row.activeEnrollments,
        row.monthlyCents,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="revenue-${date}.csv"`,
    },
  });
}

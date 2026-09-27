import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getAttendanceRates } from "@/lib/db/reports";
import { csvEscape } from "@/lib/utils";

const COLUMNS = ["Student", "Attended", "Eligible", "RatePercent"];

export async function GET() {
  await requirePermission(PERMISSIONS.ANALYTICS_VIEW);

  const report = await getAttendanceRates(30);
  const lines = [COLUMNS.join(",")];
  for (const row of report.rows) {
    lines.push(
      [row.name, row.attended, row.eligible, row.ratePercent ?? ""]
        .map(csvEscape)
        .join(","),
    );
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-rates-${date}.csv"`,
    },
  });
}

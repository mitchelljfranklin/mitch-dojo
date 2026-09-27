import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCelebrations } from "@/lib/db/reports";
import { csvEscape } from "@/lib/utils";

const COLUMNS = ["Student", "Day", "Years"];

export async function GET(request: Request) {
  await requirePermission(PERMISSIONS.ANALYTICS_VIEW);

  const variant = new URL(request.url).searchParams.get("variant");
  const celebrations = await getCelebrations();
  const rows =
    variant === "anniversaries"
      ? celebrations.anniversaries
      : celebrations.birthdays;

  const lines = [COLUMNS.join(",")];
  for (const row of rows) {
    lines.push([row.name, row.day, row.years].map(csvEscape).join(","));
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  const label = variant === "anniversaries" ? "anniversaries" : "birthdays";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${label}-${date}.csv"`,
    },
  });
}

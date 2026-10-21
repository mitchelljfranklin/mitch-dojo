import { renderToBuffer } from "@react-pdf/renderer";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getSessionRoster } from "@/lib/db/attendance";
import { resolvePdfBrand } from "@/lib/pdf/brand";
import {
  AttendanceSheetPdfDocument,
  shapeAttendanceSheet,
} from "@/lib/pdf/attendance-sheet";
import { getAttendancePdfLabels } from "@/lib/pdf/labels";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  await requirePermission(PERMISSIONS.ATTENDANCE_VIEW);
  const { sessionId } = await params;

  // Mirror the sheet's scope so the printed record matches what was on screen.
  const includeAll = new URL(request.url).searchParams.get("scope") === "all";
  const { session, roster } = await getSessionRoster(sessionId, {
    includeAll,
  });
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const [brand, labels] = await Promise.all([
    resolvePdfBrand(),
    getAttendancePdfLabels(),
  ]);
  const data = shapeAttendanceSheet({
    courseName: session.courseName,
    locationName: session.locationName,
    trainerName: session.trainerName,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.status,
    entries: roster.map((entry) => ({
      name: `${entry.firstName} ${entry.lastName}`,
      status: entry.status,
    })),
    generatedAt: new Date(),
  });

  const buffer = await renderToBuffer(
    <AttendanceSheetPdfDocument brand={brand} data={data} labels={labels} />,
  );

  const fileName = `attendance-${session.courseName}-${session.date
    .toISOString()
    .slice(0, 10)}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

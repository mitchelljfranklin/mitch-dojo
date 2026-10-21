import { renderToBuffer } from "@react-pdf/renderer";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getStudent } from "@/lib/db/students";
import { getStudentBeltHistory } from "@/lib/db/belts";
import { prisma } from "@/lib/prisma";
import { getMembershipsSettings } from "@/lib/settings";
import { TRAINED_STATUSES } from "@/lib/schemas/attendance";
import { resolvePdfBrand } from "@/lib/pdf/brand";
import { ReportCardPdfDocument, shapeReportCard } from "@/lib/pdf/report-card";
import { getReportCardPdfLabels } from "@/lib/pdf/labels";
import { computeInvoiceFinancials } from "@/lib/db/memberships";

export const dynamic = "force-dynamic";

// Student photo → data URL for the PDF renderer (it cannot fetch URLs).
async function loadPhotoDataUrl(
  photoKey: string | null,
): Promise<string | null> {
  if (!photoKey) return null;
  const { storage } = await import("@/lib/storage");
  try {
    const file = await storage.read(photoKey);
    if (!file) return null;
    const ext = photoKey.split(".").pop()?.toLowerCase() ?? "png";
    const mime =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "webp"
          ? "image/webp"
          : "image/png";
    return `data:${mime};base64,${Buffer.from(file).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  await requirePermission(PERMISSIONS.STUDENTS_VIEW);
  const { studentId } = await params;

  const student = await getStudent(studentId);
  if (!student) {
    return new Response("Student not found", { status: 404 });
  }

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86_400_000);

  const [
    belts,
    openInvoices,
    settings,
    brand,
    labels,
    photoDataUrl,
    trainedTotal,
    trainedLast30Days,
  ] = await Promise.all([
    getStudentBeltHistory(studentId),
    prisma.invoice.findMany({
      where: { studentId, status: "OPEN" },
      include: {
        items: { select: { quantity: true, unitPriceCents: true } },
        payments: { select: { amountCents: true } },
      },
    }),
    getMembershipsSettings(),
    resolvePdfBrand(),
    getReportCardPdfLabels(),
    loadPhotoDataUrl(student.photoKey),
    // Generic training summary (Present + Late), not per-discipline.
    prisma.attendance.count({
      where: {
        studentId,
        status: { in: [...TRAINED_STATUSES] },
      },
    }),
    prisma.attendance.count({
      where: {
        studentId,
        status: { in: [...TRAINED_STATUSES] },
        session: { date: { gte: thirtyDaysAgo } },
      },
    }),
  ]);
  const balanceCents = openInvoices.reduce(
    (sum, invoice) => sum + computeInvoiceFinancials(invoice).balanceCents,
    0,
  );

  const data = shapeReportCard({
    studentName: `${student.firstName} ${student.lastName}`,
    photoDataUrl,
    belts: belts.flatMap((belt) =>
      belt.beltRangeEntry
        ? [
            {
              disciplineName: belt.beltRangeEntry.discipline.name,
              beltName: belt.beltRangeEntry.name,
              colorHex: belt.beltRangeEntry.colorHex,
              awardedAt: belt.awardedAt,
            },
          ]
        : [],
    ),
    trainedTotal,
    trainedLast30Days,
    balanceCents,
    currency: settings.currency,
    generatedAt: today,
  });

  const buffer = await renderToBuffer(
    <ReportCardPdfDocument brand={brand} data={data} labels={labels} />,
  );

  const fileName = `report-${student.firstName}-${student.lastName}`
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

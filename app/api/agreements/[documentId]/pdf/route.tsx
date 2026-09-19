import { renderToBuffer } from "@react-pdf/renderer";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getStudent } from "@/lib/db/students";
import { getAgreementDocumentById } from "@/lib/db/agreements";
import { resolvePdfBrand } from "@/lib/pdf/brand";
import { AgreementPdfDocument, shapeAgreementPdf } from "@/lib/pdf/agreement";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  await requirePermission(PERMISSIONS.STUDENTS_VIEW);
  const { documentId } = await params;
  const studentId = new URL(request.url).searchParams.get("studentId") ?? "";

  const [document, student, brand] = await Promise.all([
    getAgreementDocumentById(documentId),
    getStudent(studentId),
    resolvePdfBrand(),
  ]);
  if (!document) {
    return new Response("Document not found", { status: 404 });
  }
  if (!student) {
    return new Response("Student not found", { status: 404 });
  }

  const data = shapeAgreementPdf({
    documentTitle: document.title,
    version: document.version,
    bodyMarkdown: document.bodyMarkdown,
    studentName: `${student.firstName} ${student.lastName}`,
    orgName: brand.orgName,
  });

  const buffer = await renderToBuffer(
    <AgreementPdfDocument brand={brand} data={data} />,
  );

  const fileName = `${document.title}-${student.firstName}-${student.lastName}`
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

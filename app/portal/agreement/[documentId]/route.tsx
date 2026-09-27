import { cookies } from "next/headers";
import { renderToBuffer } from "@react-pdf/renderer";

import { getStudent } from "@/lib/db/students";
import { getAgreementDocumentById } from "@/lib/db/agreements";
import { portalHasStudent } from "@/lib/db/portal";
import { resolvePdfBrand } from "@/lib/pdf/brand";
import { AgreementPdfDocument, shapeAgreementPdf } from "@/lib/pdf/agreement";

export const dynamic = "force-dynamic";

const PORTAL_COOKIE = "portal_token";

// Token-authorized agreement PDF for the member portal — the token must grant
// the student named in the query string.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(PORTAL_COOKIE)?.value ?? "";
  const studentId = new URL(request.url).searchParams.get("studentId") ?? "";

  if (!studentId || !(await portalHasStudent(rawToken, studentId))) {
    return new Response("Not found", { status: 404 });
  }

  const [document, student, brand] = await Promise.all([
    getAgreementDocumentById(documentId),
    getStudent(studentId),
    resolvePdfBrand(),
  ]);
  if (!document || !student) {
    return new Response("Not found", { status: 404 });
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

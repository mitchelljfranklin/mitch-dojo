import { cookies } from "next/headers";
import { renderToBuffer } from "@react-pdf/renderer";

import { getMembershipsSettings } from "@/lib/settings";
import { getInvoiceDetail } from "@/lib/db/memberships";
import { portalHasStudent } from "@/lib/db/portal";
import { resolvePdfBrand } from "@/lib/pdf/brand";
import { InvoicePdfDocument, shapeInvoiceForPdf } from "@/lib/pdf/invoice";

export const dynamic = "force-dynamic";

const PORTAL_COOKIE = "portal_token";

// Token-authorized invoice PDF for the member portal — a member can download
// only an invoice belonging to a student their portal token grants.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(PORTAL_COOKIE)?.value ?? "";

  const detail = await getInvoiceDetail(invoiceId);
  if (!detail || !(await portalHasStudent(rawToken, detail.studentId))) {
    return new Response("Not found", { status: 404 });
  }

  const [settings, brand] = await Promise.all([
    getMembershipsSettings(),
    resolvePdfBrand(),
  ]);

  const data = shapeInvoiceForPdf({
    number: detail.number,
    status: detail.status,
    issueDate: detail.issueDate,
    dueDate: detail.dueDate,
    locationName: detail.location?.name ?? null,
    notes: detail.notes,
    studentName: `${detail.student.firstName} ${detail.student.lastName}`,
    items: detail.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    })),
    payments: detail.payments.map((payment) => ({
      amountCents: payment.amountCents,
      method: payment.method,
      paidAt: payment.paidAt,
      reference: payment.reference,
    })),
    currency: settings.currency,
    taxCents: detail.taxCents,
    taxLabel: detail.taxLabel,
  });

  const buffer = await renderToBuffer(
    <InvoicePdfDocument brand={brand} data={data} />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${detail.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

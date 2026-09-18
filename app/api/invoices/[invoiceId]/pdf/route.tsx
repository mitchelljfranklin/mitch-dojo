import { renderToBuffer } from "@react-pdf/renderer";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getInvoiceDetail } from "@/lib/db/memberships";
import { getMembershipsSettings } from "@/lib/settings";
import { resolvePdfBrand } from "@/lib/pdf/brand";
import { InvoicePdfDocument, shapeInvoiceForPdf } from "@/lib/pdf/invoice";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  await requirePermission(PERMISSIONS.MEMBERSHIPS_VIEW);
  const { invoiceId } = await params;

  const [detail, settings, brand] = await Promise.all([
    getInvoiceDetail(invoiceId),
    getMembershipsSettings(),
    resolvePdfBrand(),
  ]);
  if (!detail) {
    return new Response("Invoice not found", { status: 404 });
  }

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

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getTrainerVerificationView } from "@/lib/db/verifications";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trainerId: string }> },
) {
  await requirePermission(PERMISSIONS.CLASSES_VIEW);
  const { trainerId } = await params;
  const view = await getTrainerVerificationView(trainerId);
  return Response.json({
    rows: view.rows.map((row) => ({
      ...row,
      issuedAt: row.issuedAt ? row.issuedAt.toISOString() : null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    })),
    summary: view.summary,
  });
}

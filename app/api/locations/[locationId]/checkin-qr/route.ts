import QRCode from "qrcode";

import { env } from "@/lib/env";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCheckinToken, regenerateCheckinToken } from "@/lib/db/checkin";
import { prisma } from "@/lib/prisma";

// Renders the public check-in QR for a location as an SVG. The token is
// issued on first use; Regenerate (in Settings) re-issues and therefore
// invalidates any previously printed QR/link.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locationId: string }> },
) {
  await requirePermission(PERMISSIONS.LOCATIONS_EDIT);
  const { locationId } = await params;

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true },
  });
  if (!location) {
    return new Response("Location not found", { status: 404 });
  }

  let token = await getCheckinToken(locationId);
  if (!token) {
    token = await regenerateCheckinToken(locationId);
  }

  const url = `${env.APP_URL}/checkin/${token}`;
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}

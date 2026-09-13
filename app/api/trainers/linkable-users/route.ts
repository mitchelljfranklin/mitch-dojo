import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listLinkableUsers } from "@/lib/db/trainers";

export async function GET() {
  await requirePermission(PERMISSIONS.CLASSES_EDIT);
  const users = await listLinkableUsers();
  return Response.json(users);
}

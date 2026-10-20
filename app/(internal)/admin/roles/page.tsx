import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FlashToast } from "@/components/flash-toast";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listRoles } from "@/lib/db/roles";

import { RolesManager } from "../roles-manager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Roles" };

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);
  const roles = await listRoles();
  const query = await searchParams;

  const roleViews = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    isSystem: role.isSystem,
    userCount: role._count.users,
  }));

  return (
    <div className="flex flex-col gap-6">
      {query.roleError ? (
        <FlashToast variant="error" message={query.roleError} />
      ) : null}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
        <p className="text-muted-foreground text-sm">
          Permission sets assigned to staff accounts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            Define permission sets and assign them to staff accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RolesManager roles={roleViews} />
        </CardContent>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listStaffAccounts } from "@/lib/db/users";
import { listRoles } from "@/lib/db/roles";

import { UsersManager } from "../users-manager";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.users");
  return { title: translate("metaTitle") };
}

export default async function AdminUsersPage() {
  const currentUser = await requirePermission(PERMISSIONS.USERS_MANAGE);
  const translate = await getTranslations("Admin.users");
  const [staffAccounts, roles] = await Promise.all([
    listStaffAccounts(),
    listRoles(),
  ]);
  const roleOptions = roles.map((role) => ({ id: role.id, name: role.name }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translate("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{translate("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translate("cardTitle")}</CardTitle>
          <CardDescription>{translate("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersManager
            users={staffAccounts}
            roles={roleOptions}
            currentUserId={currentUser.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}

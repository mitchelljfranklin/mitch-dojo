import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getStorageSettingsView } from "@/lib/settings";

import { StorageForm } from "../storage-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Storage" };

export default async function AdminStoragePage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const storageSettings = await getStorageSettingsView();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Storage</h1>
        <p className="text-muted-foreground text-sm">
          Where brand files, student photos, and attachments live.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File storage</CardTitle>
          <CardDescription>
            Configure the storage provider. Changing providers does not migrate
            existing files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StorageForm defaults={storageSettings} />
        </CardContent>
      </Card>
    </div>
  );
}

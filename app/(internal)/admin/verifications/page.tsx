import { FlashToast } from "@/components/flash-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listVerificationTypes } from "@/lib/db/verifications";

import { VerificationTypesManager } from "./verification-types-manager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Verifications" };

type AdminVerificationsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminVerificationsPage({
  searchParams,
}: AdminVerificationsPageProps) {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const sp = await searchParams;
  const types = await listVerificationTypes();

  return (
    <div className="flex flex-col gap-6">
      {sp.error ? <FlashToast message={sp.error} variant="error" /> : null}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verifications</h1>
        <p className="text-muted-foreground text-sm">
          Credential types your trainers may need. Record the details against
          each trainer on the Trainers page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification types</CardTitle>
          <CardDescription>
            Fully school-managed, so the same set works in any state or country.
            Mark a type Required to flag trainers who have not recorded it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VerificationTypesManager types={types} />
        </CardContent>
      </Card>
    </div>
  );
}

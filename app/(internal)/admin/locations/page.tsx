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
import { listLocationsWithCounts } from "@/lib/db/locations";

import { LocationsManager } from "../locations-manager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Locations" };

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission(PERMISSIONS.LOCATIONS_EDIT);
  const locations = await listLocationsWithCounts();
  const query = await searchParams;

  const locationViews = locations.map((location) => ({
    id: location.id,
    name: location.name,
    address: location.address,
    phone: location.phone,
    email: location.email,
    isActive: location.isActive,
    sortOrder: location.sortOrder,
    studentCount: location._count.studentLocations,
    checkinToken: location.checkinToken,
  }));

  return (
    <div className="flex flex-col gap-6">
      {query.locationError ? (
        <FlashToast variant="error" message={query.locationError} />
      ) : null}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <p className="text-muted-foreground text-sm">
          Dojo sites belonging to the school. Students are assigned to one or
          more locations; every class runs at exactly one.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription>
            The QR check-in token regenerates on request; the old link stops
            working immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LocationsManager locations={locationViews} />
        </CardContent>
      </Card>
    </div>
  );
}

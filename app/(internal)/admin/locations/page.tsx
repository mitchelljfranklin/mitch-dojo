import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

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

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.locations");
  return { title: translate("metaTitle") };
}

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission(PERMISSIONS.LOCATIONS_EDIT);
  const translate = await getTranslations("Admin.locations");
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
          <LocationsManager locations={locationViews} />
        </CardContent>
      </Card>
    </div>
  );
}

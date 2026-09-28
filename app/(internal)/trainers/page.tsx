import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listTrainers } from "@/lib/db/trainers";
import { getVerificationSummaries } from "@/lib/db/verifications";

import { TrainersManager } from "./trainers-manager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Trainers" };

export default async function TrainersPage() {
  const user = await requirePermission(PERMISSIONS.CLASSES_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.CLASSES_EDIT);

  const [trainers, summaries] = await Promise.all([
    listTrainers(),
    getVerificationSummaries(),
  ]);
  const empty = { expired: 0, expiring: 0, missing: 0 };
  const trainersWithVerifications = trainers.map((trainer) => ({
    ...trainer,
    verifications: summaries.get(trainer.id) ?? empty,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trainers</h1>
          <p className="text-muted-foreground text-sm">
            Instructors who run your classes. Some may also have staff accounts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/classes">View courses</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/classes/schedule">Weekly schedule</Link>
          </Button>
        </div>
      </div>

      <TrainersManager trainers={trainersWithVerifications} canEdit={canEdit} />
    </div>
  );
}

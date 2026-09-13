import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listCoursesWithBeltCounts } from "@/lib/db/belts";

export const dynamic = "force-dynamic";

export const metadata = { title: "Belts & gradings" };

export default async function BeltsPage() {
  await requirePermission(PERMISSIONS.BELTS_VIEW);
  const courses = await listCoursesWithBeltCounts();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs segments={[{ label: "Belts & gradings" }]} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Belts & gradings
          </h1>
          <p className="text-muted-foreground text-sm">
            Belt requirements and student progression per course.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/classes">View courses</Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No courses yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Create a course first — belt levels belong to courses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <a key={course.id} href={`/belts/${course.id}`}>
              <Card className="hover:bg-accent/40 h-full transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate">{course.name}</CardTitle>
                    {course.isActive ? null : (
                      <Badge variant="outline" className="shrink-0">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {course.location.name}
                  </p>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  {course._count.beltLevels} belt level
                  {course._count.beltLevels === 1 ? "" : "s"} defined
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getClientIp } from "@/lib/client-ip";
import {
  getCheckinPageData,
  getLocationIdByCheckinToken,
} from "@/lib/db/checkin";
import { rateLimit } from "@/lib/rate-limit";

import { checkInAction } from "./actions";
import { KioskToggle } from "./kiosk-toggle";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Checkin");
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

const CHECKIN_PAGE_LOADS_PER_MIN = 30;

type CheckinPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function CheckinPage({
  params,
  searchParams,
}: CheckinPageProps) {
  const { token } = await params;
  const sp = await searchParams;
  const t = await getTranslations("Checkin");

  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  if (!rateLimit("checkin-page", clientIp, CHECKIN_PAGE_LOADS_PER_MIN)) {
    return (
      <div className="mx-auto max-w-md p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("rateLimitedTitle")}</CardTitle>
            <CardDescription>{t("rateLimitedDescription")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const locationId = await getLocationIdByCheckinToken(token);
  if (!locationId) {
    notFound();
  }

  const { locationName, sessions } = await getCheckinPageData(locationId);
  const kiosk = sp.kiosk === "1";

  return (
    // Kiosk mode drops the brand chrome and goes edge-to-edge so the roster
    // fills a front-desk tablet.
    <div
      className={kiosk ? "flex min-h-svh flex-col p-4" : "mx-auto max-w-md p-6"}
    >
      <div className="mb-4 flex items-center justify-end gap-2">
        <LocaleSwitcher />
        <KioskToggle kiosk={kiosk} />
      </div>
      {kiosk ? null : <BrandMark />}
      <div className={kiosk ? "mb-6 text-center" : "mb-6 text-center"}>
        <h1
          className={
            kiosk
              ? "text-3xl font-semibold tracking-tight"
              : "text-2xl font-semibold tracking-tight"
          }
        >
          {t("title", { location: locationName ?? "" })}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      {sp.error === "suspended" ? (
        <Card className="border-destructive/40 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive text-base">
              {t("suspendedTitle")}
            </CardTitle>
            <CardDescription>{t("suspendedDescription")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {sp.error === "agreements" ? (
        <Card className="border-destructive/40 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive text-base">
              {t("agreementsTitle")}
            </CardTitle>
            <CardDescription>{t("agreementsDescription")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {sessions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("noClassesTitle")}</CardTitle>
            <CardDescription>{t("noClassesDescription")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div
          className={
            kiosk ? "flex flex-1 flex-col gap-6" : "flex flex-col gap-4"
          }
        >
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader className="pb-2">
                <CardTitle className={kiosk ? "text-2xl" : "text-lg"}>
                  {session.courseName}
                </CardTitle>
                <CardDescription>
                  <span className="font-mono text-xs">
                    {session.startTime}–{session.endTime}
                  </span>
                  {session.trainerName ? (
                    <span> · {session.trainerName}</span>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2 text-xs">
                  {t("tapToCheckIn")}
                </p>
                <CheckinSessionGroup
                  token={token}
                  sessionId={session.id}
                  students={session.students}
                  action={checkInAction}
                  kiosk={kiosk}
                  emptyLabel={t("noStudents")}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckinSessionGroup({
  token,
  sessionId,
  students,
  action,
  kiosk,
  emptyLabel,
}: {
  token: string;
  sessionId: string;
  students: { studentId: string; name: string; checkedIn: boolean }[];
  action: (formData: FormData) => Promise<void>;
  kiosk: boolean;
  emptyLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {students.map((student) => (
        <form key={student.studentId} action={action}>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="studentId" value={student.studentId} />
          <button
            type="submit"
            disabled={student.checkedIn}
            className={`rounded-full border transition-colors ${
              kiosk ? "px-6 py-4 text-xl" : "px-4 py-2 text-sm"
            } ${
              student.checkedIn
                ? "bg-success/15 border-success/30 text-success cursor-default"
                : "hover:bg-accent hover:border-primary/40"
            }`}
          >
            {student.checkedIn ? "✓ " : ""}
            {student.name}
          </button>
        </form>
      ))}
      {students.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      ) : null}
    </div>
  );
}

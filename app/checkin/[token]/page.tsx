import { headers } from "next/headers";
import { notFound } from "next/navigation";

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

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Check in",
  robots: { index: false, follow: false },
};

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

  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  if (!rateLimit("checkin-page", clientIp, CHECKIN_PAGE_LOADS_PER_MIN)) {
    return (
      <div className="mx-auto max-w-md p-8">
        <Card>
          <CardHeader>
            <CardTitle>Too many requests</CardTitle>
            <CardDescription>
              Please wait a moment and try again.
            </CardDescription>
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

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Check in at {locationName}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tap your name under today&apos;s class to check in.
        </p>
      </div>

      {sp.error === "suspended" ? (
        <Card className="border-destructive/40 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive text-base">
              Membership suspended
            </CardTitle>
            <CardDescription>
              Please speak to staff at the front desk before training.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {sessions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No classes today</CardTitle>
            <CardDescription>
              There are no scheduled sessions at this location today. See you
              next class!
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{session.courseName}</CardTitle>
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
                  Tap your name to check in
                </p>
                <CheckinSessionGroup
                  token={token}
                  sessionId={session.id}
                  students={session.students}
                  action={checkInAction}
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
}: {
  token: string;
  sessionId: string;
  students: { studentId: string; name: string; checkedIn: boolean }[];
  action: (formData: FormData) => Promise<void>;
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
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
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
        <p className="text-muted-foreground text-sm">No students assigned.</p>
      ) : null}
    </div>
  );
}

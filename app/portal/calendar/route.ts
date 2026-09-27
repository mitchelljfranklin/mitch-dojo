import { cookies } from "next/headers";

import {
  getHouseholdPortalChildren,
  getPortalUpcomingSessions,
  resolvePortalToken,
} from "@/lib/db/portal";
import { buildIcs, type IcsEvent } from "@/lib/ics";

export const dynamic = "force-dynamic";

const PORTAL_COOKIE = "portal_token";

function toLocalDateTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hours ?? 0,
    minutes ?? 0,
  );
}

// Token-authorized .ics of the member's (or household's) upcoming classes.
export async function GET() {
  const cookieStore = await cookies();
  const access = await resolvePortalToken(
    cookieStore.get(PORTAL_COOKIE)?.value ?? "",
  );
  if (!access) {
    return new Response("Not found", { status: 404 });
  }

  const studentIds = access.studentId
    ? [access.studentId]
    : access.householdId
      ? (await getHouseholdPortalChildren(access.householdId)).map(
          (child) => child.id,
        )
      : [];

  const seen = new Set<string>();
  const events: IcsEvent[] = [];
  for (const studentId of studentIds) {
    const sessions = await getPortalUpcomingSessions(studentId);
    for (const session of sessions) {
      if (seen.has(session.id)) continue;
      seen.add(session.id);
      events.push({
        uid: `${session.id}@mitch-dojo`,
        start: toLocalDateTime(session.date, session.startTime),
        end: toLocalDateTime(session.date, session.endTime),
        summary: session.courseName,
        location: session.locationName,
        description: session.trainerName
          ? `Trainer: ${session.trainerName}`
          : null,
      });
    }
  }

  const ics = buildIcs(
    events.sort((a, b) => a.start.getTime() - b.start.getTime()),
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="classes.ics"',
      "Cache-Control": "no-store",
    },
  });
}

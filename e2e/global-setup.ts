import "dotenv/config";

import { writeFileSync } from "node:fs";

import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import { createUser, toggleUserDisabled } from "@/lib/db/users";
import { SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ensureUpcomingSessions } from "@/lib/db/sessions";
import { regenerateCheckinToken } from "@/lib/db/checkin";
import {
  getOperationsSettings,
  updateOperationsSettings,
} from "@/lib/settings";

const RATE_LIMIT_FILE = "e2e/.ratelimit-original";
const CHECKIN_TOKEN_FILE = "e2e/.checkin-token";

export const E2E_ADMIN_EMAIL = "e2e-admin@example.test";
export const E2E_ADMIN_PASSWORD = "admin-password-12345";
export const E2E_VIEWER_EMAIL = "e2e-viewer@example.test";
export const E2E_VIEWER_PASSWORD = "viewer-password-12345";

const E2E_LOCATION_NAME = "E2E Dojo";
const E2E_STUDENT_QUERY = { firstName: "E2E", lastName: "Student" };
const ATTENDANCE_KID_QUERY = { firstName: "E2E", lastName: "Attend Kid" };
const NO_DISCIPLINE_KID_QUERY = {
  firstName: "E2E",
  lastName: "NoDiscipline Kid",
};
const ATTENDANCE_COURSE_NAME = "E2E Attend Course";
const HISTORY_COURSE_NAME = "E2E History Course";

export default async function globalSetup() {
  // The suite signs in many times from one IP; raise the login throttle so the
  // per-IP rate limiter doesn't fail otherwise-unrelated tests. The original
  // value is persisted for global-teardown to restore.
  const operationsSettings = await getOperationsSettings();
  writeFileSync(
    RATE_LIMIT_FILE,
    String(operationsSettings.loginRateLimitPerMin),
    "utf8",
  );
  await updateOperationsSettings({ loginRateLimitPerMin: 1000 });

  await ensureSystemRoles();

  // Seed locations used by the student specs; the default Main Dojo comes
  // from the seed script but is re-upserted here so the suite never depends
  // on seed state.
  await prisma.location.upsert({
    where: { name: "Main Dojo" },
    update: { isActive: true },
    create: { name: "Main Dojo", isActive: true, sortOrder: 0 },
  });
  const e2eDojo = await prisma.location.upsert({
    where: { name: E2E_LOCATION_NAME },
    update: { isActive: true },
    create: { name: E2E_LOCATION_NAME, isActive: true, sortOrder: 10 },
  });

  // Remove leftovers from previous runs so create-flows stay deterministic.
  await prisma.classSession.deleteMany({
    where: {
      course: {
        name: {
          in: ["E2E Course", ATTENDANCE_COURSE_NAME, HISTORY_COURSE_NAME],
        },
      },
    },
  });
  await prisma.course.deleteMany({
    where: {
      name: {
        in: ["E2E Course", ATTENDANCE_COURSE_NAME, HISTORY_COURSE_NAME],
      },
    },
  });
  await prisma.trainer.deleteMany({ where: { name: "E2E Sensei" } });
  await prisma.location.deleteMany({ where: { name: "E2E Dojo Two" } });
  await prisma.studentLocation.deleteMany({
    where: {
      student: {
        OR: [E2E_STUDENT_QUERY, ATTENDANCE_KID_QUERY, NO_DISCIPLINE_KID_QUERY],
      },
    },
  });
  await prisma.student.deleteMany({
    where: {
      OR: [E2E_STUDENT_QUERY, ATTENDANCE_KID_QUERY, NO_DISCIPLINE_KID_QUERY],
    },
  });

  // The memberships spec's plan — safe to delete now that student deletion
  // cascaded its enrollments and invoices.
  await prisma.membershipPlan.deleteMany({
    where: { name: "E2E Monthly Membership" },
  });

  // A student at the e2e location for the attendance + public check-in specs.
  const attendanceKid = await prisma.student.create({
    data: {
      firstName: ATTENDANCE_KID_QUERY.firstName,
      lastName: ATTENDANCE_KID_QUERY.lastName,
      status: "ACTIVE",
      locations: {
        create: { locationId: e2eDojo.id, isPrimary: true },
      },
    },
  });

  // A course at the e2e location with a slot TODAY so generated sessions
  // exist for the attendance and public check-in specs on any weekday.
  // The discipline ladder is created separately (ladder lives on the
  // discipline, not the course).
  // Delete and recreate the discipline each run so the belt ladder is
  // always fresh (beltRangeEntries live on the discipline, not the course).
  await prisma.discipline.deleteMany({ where: { name: "E2E Karate" } });
  const karateDiscipline = await prisma.discipline.create({
    data: {
      name: "E2E Karate",
      beltRangeEntries: {
        create: [
          {
            name: "Novice",
            colorHex: "#FFFFFF",
            order: 0,
            requiredTrainings: 0,
          },
          {
            name: "Advanced",
            colorHex: "#8B4513",
            order: 1,
            requiredTrainings: 99,
          },
        ],
      },
    },
  });
  await prisma.course.create({
    data: {
      name: ATTENDANCE_COURSE_NAME,
      locationId: e2eDojo.id,
      disciplineId: karateDiscipline.id,
      trainingTimes: {
        create: [
          {
            weekday: new Date().getDay(),
            startTime: "06:00",
            endTime: "07:00",
          },
        ],
      },
    },
  });

  // The attendance kid trains Karate — required for the progression table
  // to list them (students are linked to disciplines, not courses).
  await prisma.studentDiscipline.create({
    data: { studentId: attendanceKid.id, disciplineId: karateDiscipline.id },
  });

  // A student with NO discipline assignment: the belts spec asserts they are
  // absent from the Karate progression table.
  await prisma.student.create({
    data: {
      firstName: "E2E",
      lastName: "NoDiscipline Kid",
      status: "ACTIVE",
      locations: {
        create: { locationId: e2eDojo.id, isPrimary: true },
      },
    },
  });
  await ensureUpcomingSessions();

  // A second course for the history-import spec (belt ladder lives on the
  // discipline, so no belt setup needed here).
  await prisma.course.create({
    data: {
      name: HISTORY_COURSE_NAME,
      locationId: e2eDojo.id,
      disciplineId: karateDiscipline.id,
    },
  });

  // Issue the public check-in token for the e2e location and share it with
  // the specs (same pattern as mitch-risk's portal token file).
  const checkinToken = await regenerateCheckinToken(e2eDojo.id);
  writeFileSync(CHECKIN_TOKEN_FILE, checkinToken, "utf8");

  const adminRole = await getRoleByName(SYSTEM_ROLE_NAMES.ADMIN);
  if (!adminRole) {
    throw new Error("Admin role not found during e2e setup.");
  }
  await prisma.user.deleteMany({ where: { email: E2E_ADMIN_EMAIL } });
  const admin = await createUser({
    name: "E2E Admin",
    email: E2E_ADMIN_EMAIL,
    password: E2E_ADMIN_PASSWORD,
    roleId: adminRole.id,
  });

  const viewerRole = await getRoleByName(SYSTEM_ROLE_NAMES.VIEWER);
  if (!viewerRole) {
    throw new Error("Viewer role not found during e2e setup.");
  }
  await prisma.user.deleteMany({ where: { email: E2E_VIEWER_EMAIL } });
  const viewer = await createUser({
    name: "E2E Viewer",
    email: E2E_VIEWER_EMAIL,
    password: E2E_VIEWER_PASSWORD,
    roleId: viewerRole.id,
  });

  await toggleUserDisabled(admin.id, false);
  await toggleUserDisabled(viewer.id, false);

  await prisma.$disconnect();
}

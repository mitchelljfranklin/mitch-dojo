import "dotenv/config";

import { writeFileSync } from "node:fs";

import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import { createUser, toggleUserDisabled } from "@/lib/db/users";
import { SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  getOperationsSettings,
  updateOperationsSettings,
} from "@/lib/settings";

const RATE_LIMIT_FILE = "e2e/.ratelimit-original";

export const E2E_ADMIN_EMAIL = "e2e-admin@example.test";
export const E2E_ADMIN_PASSWORD = "admin-password-12345";
export const E2E_VIEWER_EMAIL = "e2e-viewer@example.test";
export const E2E_VIEWER_PASSWORD = "viewer-password-12345";

const E2E_LOCATION_NAME = "E2E Dojo";
const E2E_STUDENT_QUERY = { firstName: "E2E", lastName: "Student" };

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
  // from the seed script, the e2e one is created (idempotently) here.
  await prisma.location.upsert({
    where: { name: E2E_LOCATION_NAME },
    update: { isActive: true },
    create: { name: E2E_LOCATION_NAME, isActive: true, sortOrder: 10 },
  });

  // Remove leftovers from previous runs so create-flows stay deterministic.
  await prisma.classSession.deleteMany({
    where: { course: { name: "E2E Course" } },
  });
  await prisma.course.deleteMany({ where: { name: "E2E Course" } });
  await prisma.trainer.deleteMany({ where: { name: "E2E Sensei" } });
  await prisma.studentLocation.deleteMany({
    where: { student: { is: E2E_STUDENT_QUERY } },
  });
  await prisma.student.deleteMany({ where: E2E_STUDENT_QUERY });

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

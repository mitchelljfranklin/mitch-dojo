import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { ALL_PERMISSIONS, SYSTEM_ROLE_DEFINITIONS } from "@/lib/permissions";
import { convergeSystemRolePermissions, listRoles } from "@/lib/db/roles";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDatabase)("convergeSystemRolePermissions", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("ensures every system role holds its code-defined permissions", async () => {
    await convergeSystemRolePermissions();

    const roles = await listRoles();
    for (const definition of SYSTEM_ROLE_DEFINITIONS) {
      const role = roles.find((row) => row.name === definition.name);
      expect(role, `${definition.name} should exist`).toBeDefined();
      for (const permission of definition.permissions) {
        expect(role!.permissions).toContain(permission);
      }
    }
  });

  it("is idempotent and leaves Admin with all permissions", async () => {
    await convergeSystemRolePermissions();
    await convergeSystemRolePermissions();

    const admin = (await listRoles()).find((role) => role.name === "Admin");
    expect(admin?.permissions).toEqual(
      expect.arrayContaining([...ALL_PERMISSIONS]),
    );
    expect(admin?.permissions.length).toBe(ALL_PERMISSIONS.length);
  });
});

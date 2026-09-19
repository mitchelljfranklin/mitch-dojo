export const PERMISSIONS = {
  STUDENTS_VIEW: "students:view",
  STUDENTS_CREATE: "students:create",
  STUDENTS_EDIT: "students:edit",
  STUDENTS_DELETE: "students:delete",
  STUDENTS_MEDICAL: "students:medical",
  LOCATIONS_EDIT: "locations:edit",
  CLASSES_VIEW: "classes:view",
  CLASSES_EDIT: "classes:edit",
  ATTENDANCE_VIEW: "attendance:view",
  ATTENDANCE_MARK: "attendance:mark",
  BELTS_VIEW: "belts:view",
  BELTS_EDIT: "belts:edit",
  MEMBERSHIPS_VIEW: "memberships:view",
  MEMBERSHIPS_EDIT: "memberships:edit",
  ANALYTICS_VIEW: "analytics:view",
  COMMUNICATIONS_EDIT: "communications:edit",
  AUDIT_VIEW: "audit:view",
  USERS_MANAGE: "users:manage",
  ROLES_MANAGE: "roles:manage",
  SETTINGS_MANAGE: "settings:manage",
  API_MANAGE: "api:manage",
  PROFILE_VIEW: "profile:view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: readonly Permission[] =
  Object.values(PERMISSIONS);

type PermissionGroup = {
  resource: string;
  label: string;
  permissions: { key: Permission; label: string }[];
};

export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    resource: "students",
    label: "Students",
    permissions: [
      { key: PERMISSIONS.STUDENTS_VIEW, label: "View students" },
      { key: PERMISSIONS.STUDENTS_CREATE, label: "Create students" },
      { key: PERMISSIONS.STUDENTS_EDIT, label: "Edit students" },
      { key: PERMISSIONS.STUDENTS_DELETE, label: "Delete students" },
      {
        key: PERMISSIONS.STUDENTS_MEDICAL,
        label: "View medical & health information",
      },
    ],
  },
  {
    resource: "locations",
    label: "Locations",
    permissions: [
      { key: PERMISSIONS.LOCATIONS_EDIT, label: "Manage dojo locations" },
    ],
  },
  {
    resource: "classes",
    label: "Classes & schedule",
    permissions: [
      { key: PERMISSIONS.CLASSES_VIEW, label: "View classes & schedule" },
      { key: PERMISSIONS.CLASSES_EDIT, label: "Create & edit classes" },
    ],
  },
  {
    resource: "attendance",
    label: "Attendance",
    permissions: [
      { key: PERMISSIONS.ATTENDANCE_VIEW, label: "View attendance" },
      { key: PERMISSIONS.ATTENDANCE_MARK, label: "Mark attendance" },
    ],
  },
  {
    resource: "belts",
    label: "Belts & gradings",
    permissions: [
      { key: PERMISSIONS.BELTS_VIEW, label: "View belts & gradings" },
      { key: PERMISSIONS.BELTS_EDIT, label: "Record gradings & promotions" },
    ],
  },
  {
    resource: "memberships",
    label: "Memberships & payments",
    permissions: [
      {
        key: PERMISSIONS.MEMBERSHIPS_VIEW,
        label: "View memberships & payments",
      },
      {
        key: PERMISSIONS.MEMBERSHIPS_EDIT,
        label: "Manage memberships & payments",
      },
    ],
  },
  {
    resource: "analytics",
    label: "Analytics",
    permissions: [
      {
        key: PERMISSIONS.ANALYTICS_VIEW,
        label: "View analytics dashboard",
      },
    ],
  },
  {
    resource: "communications",
    label: "Communications",
    permissions: [
      {
        key: PERMISSIONS.COMMUNICATIONS_EDIT,
        label: "Send emails & campaigns",
      },
    ],
  },
  {
    resource: "administration",
    label: "Administration",
    permissions: [
      { key: PERMISSIONS.AUDIT_VIEW, label: "View audit & email logs" },
      { key: PERMISSIONS.USERS_MANAGE, label: "Manage users" },
      { key: PERMISSIONS.ROLES_MANAGE, label: "Manage roles" },
      { key: PERMISSIONS.SETTINGS_MANAGE, label: "Manage settings" },
      { key: PERMISSIONS.API_MANAGE, label: "Manage API access" },
    ],
  },
  {
    resource: "profile",
    label: "Profile",
    permissions: [
      { key: PERMISSIONS.PROFILE_VIEW, label: "View and edit own profile" },
    ],
  },
];

export const SYSTEM_ROLE_NAMES = {
  ADMIN: "Admin",
  TRAINER: "Trainer",
  VIEWER: "Viewer",
} as const;

const TRAINER_PERMISSIONS: readonly Permission[] = [
  PERMISSIONS.STUDENTS_VIEW,
  PERMISSIONS.STUDENTS_CREATE,
  PERMISSIONS.STUDENTS_EDIT,
  PERMISSIONS.STUDENTS_MEDICAL,
  PERMISSIONS.CLASSES_VIEW,
  PERMISSIONS.ATTENDANCE_VIEW,
  PERMISSIONS.ATTENDANCE_MARK,
  PERMISSIONS.BELTS_VIEW,
  PERMISSIONS.BELTS_EDIT,
  PERMISSIONS.MEMBERSHIPS_VIEW,
  PERMISSIONS.ANALYTICS_VIEW,
  PERMISSIONS.PROFILE_VIEW,
];

const VIEWER_PERMISSIONS: readonly Permission[] = [
  PERMISSIONS.STUDENTS_VIEW,
  PERMISSIONS.CLASSES_VIEW,
  PERMISSIONS.ATTENDANCE_VIEW,
  PERMISSIONS.BELTS_VIEW,
  PERMISSIONS.MEMBERSHIPS_VIEW,
  PERMISSIONS.ANALYTICS_VIEW,
  PERMISSIONS.PROFILE_VIEW,
];

export type SystemRoleDefinition = {
  name: string;
  description: string;
  permissions: readonly Permission[];
};

export const SYSTEM_ROLE_DEFINITIONS: readonly SystemRoleDefinition[] = [
  {
    name: SYSTEM_ROLE_NAMES.ADMIN,
    description:
      "Full access to every feature, including users, roles, and settings.",
    permissions: ALL_PERMISSIONS,
  },
  {
    name: SYSTEM_ROLE_NAMES.TRAINER,
    description:
      "Instructor access: view and manage students, mark attendance for their classes, and view memberships. No access to administration.",
    permissions: TRAINER_PERMISSIONS,
  },
  {
    name: SYSTEM_ROLE_NAMES.VIEWER,
    description: "Read-only access across the platform.",
    permissions: VIEWER_PERMISSIONS,
  },
];

export function isValidPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}

export function hasPermission(
  userPermissions: readonly string[],
  permission: Permission,
): boolean {
  return userPermissions.includes(permission);
}

export function hasAnyPermission(
  userPermissions: readonly string[],
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => userPermissions.includes(permission));
}

export function hasAllPermissions(
  userPermissions: readonly string[],
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) =>
    userPermissions.includes(permission),
  );
}

export function countValidPermissions(
  userPermissions: readonly string[],
): number {
  return userPermissions.filter(isValidPermission).length;
}

export type PermissionCoverage = "none" | "partial" | "full";

export type RolePermissionGroupSummary = {
  resource: string;
  label: string;
  granted: number;
  total: number;
  coverage: PermissionCoverage;
};

export function summarizeRolePermissions(
  userPermissions: readonly string[],
): RolePermissionGroupSummary[] {
  return PERMISSION_GROUPS.map((group) => {
    const total = group.permissions.length;
    const granted = group.permissions.filter((permission) =>
      userPermissions.includes(permission.key),
    ).length;
    let coverage: PermissionCoverage;
    if (granted === 0) coverage = "none";
    else if (granted === total) coverage = "full";
    else coverage = "partial";
    return {
      resource: group.resource,
      label: group.label,
      granted,
      total,
      coverage,
    };
  });
}

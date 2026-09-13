import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAnyPermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { buildFilterQueryString } from "@/lib/nav";
import { listAuditLogs, listAuditActions } from "@/lib/db/audit";
import { listStaffAccounts } from "@/lib/db/users";
import { listRoles } from "@/lib/db/roles";
import { listLocationsWithCounts } from "@/lib/db/locations";
import { prisma } from "@/lib/prisma";
import {
  getOrganizationSettings,
  getAppearanceSettings,
  getOperationsSettings,
  getAuditRetention,
  getEmailLogRetention,
  getStorageSettingsView,
  getCronSettings,
  getEmailSettings,
} from "@/lib/settings";
import { UsersManager } from "./users-manager";
import { RolesManager } from "./roles-manager";
import { LocationsManager } from "./locations-manager";
import { FlashToast } from "@/components/flash-toast";

import { OrganizationForm } from "./organization-form";
import { AppearanceForm } from "./appearance-form";
import { AuditForm } from "./audit-form";
import { OperationsForm } from "./operations-form";
import { StorageForm } from "./storage-form";
import { EmailForm } from "./email-form";
import { HealthTab } from "./health-tab";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

type SettingsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const currentUser = await requireAnyPermission([
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.ROLES_MANAGE,
    PERMISSIONS.LOCATIONS_EDIT,
    PERMISSIONS.AUDIT_VIEW,
  ]);
  const permissions = currentUser.permissions;
  const canManageSettings = hasPermission(
    permissions,
    PERMISSIONS.SETTINGS_MANAGE,
  );
  const canManageUsers = hasPermission(permissions, PERMISSIONS.USERS_MANAGE);
  const canManageRoles = hasPermission(permissions, PERMISSIONS.ROLES_MANAGE);
  const canManageLocations = hasPermission(
    permissions,
    PERMISSIONS.LOCATIONS_EDIT,
  );
  const canViewAudit = hasPermission(permissions, PERMISSIONS.AUDIT_VIEW);

  const sp = await searchParams;
  const [
    organization,
    appearance,
    operations,
    staffAccounts,
    roles,
    locations,
    storageSettings,
    email,
    auditRetention,
    emailLogRetention,
  ] = await Promise.all([
    getOrganizationSettings(),
    getAppearanceSettings(),
    getOperationsSettings(),
    listStaffAccounts(),
    listRoles(),
    listLocationsWithCounts(),
    getStorageSettingsView(),
    getEmailSettings(),
    getAuditRetention(),
    getEmailLogRetention(),
  ]);

  const cronLastRunRow = await prisma.appSetting.findUnique({
    where: { key: "cron.lastRun" },
  });
  const cronLastRun =
    cronLastRunRow && typeof cronLastRunRow.value === "string"
      ? cronLastRunRow.value
      : null;
  const cronSettings = await getCronSettings();

  const users = staffAccounts.map((account) => ({
    id: account.id,
    name: account.name,
  }));
  const roleOptions = roles.map((role) => ({ id: role.id, name: role.name }));
  const roleViews = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    isSystem: role.isSystem,
    userCount: role._count.users,
  }));

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

  const auditLogs = await listAuditLogs({
    action: sp.action,
    userId: sp.userId,
    fromDate: sp.fromDate,
    toDate: sp.toDate,
    page: sp.auditPage ? parseInt(sp.auditPage) : 1,
    pageSize: sp.auditPageSize ? parseInt(sp.auditPageSize) : undefined,
  });

  const auditFilterQuery = buildFilterQueryString({
    action: sp.action,
    userId: sp.userId,
    fromDate: sp.fromDate,
    toDate: sp.toDate,
  });

  const allowedTabs = [
    ...(canManageSettings
      ? ["general", "operations", "storage", "email", "health"]
      : []),
    ...(canManageLocations ? ["locations"] : []),
    ...(canManageUsers ? ["users"] : []),
    ...(canManageRoles ? ["roles"] : []),
    ...(canViewAudit ? ["audit"] : []),
  ];
  const defaultTab =
    sp.tab && allowedTabs.includes(sp.tab) ? sp.tab : allowedTabs[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage operational configuration. Changes apply immediately — no file
          edits required.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <div className="overflow-x-auto">
          <TabsList>
            {canManageSettings ? (
              <>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="operations">Operations</TabsTrigger>
                <TabsTrigger value="storage">Storage</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="health">Health</TabsTrigger>
              </>
            ) : null}
            {canManageLocations ? (
              <TabsTrigger value="locations">Locations</TabsTrigger>
            ) : null}
            {canManageUsers ? (
              <TabsTrigger value="users">Users</TabsTrigger>
            ) : null}
            {canManageRoles ? (
              <TabsTrigger value="roles">Roles</TabsTrigger>
            ) : null}
            {canViewAudit ? (
              <TabsTrigger value="audit">Audit</TabsTrigger>
            ) : null}
          </TabsList>
        </div>

        {canManageSettings ? (
          <>
            <TabsContent value="general" className="mt-4 flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization</CardTitle>
                  <CardDescription>
                    Branding shown across the app.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OrganizationForm
                    name={organization.name}
                    supportEmail={organization.supportEmail}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customise the logo, primary colour (buttons), and secondary
                    colour (tags/pills). Leave a field blank to use the default.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AppearanceForm
                    primaryHex={appearance.primaryHex}
                    secondaryHex={appearance.secondaryHex}
                    hasLogo={Boolean(appearance.logoKey)}
                    logoKey={appearance.logoKey ?? ""}
                    borderRadius={appearance.borderRadius}
                    pageWidth={appearance.pageWidth}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="operations"
              className="mt-4 flex flex-col gap-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Operations</CardTitle>
                  <CardDescription>
                    Sign-in throttling, session timeouts, retention, and the
                    internal scheduler.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OperationsForm
                    loginRateLimitPerMin={operations.loginRateLimitPerMin}
                    sessionTimeoutMinutes={operations.sessionTimeoutMinutes}
                    passwordResetPerMin={operations.passwordResetPerMin}
                    auditRetentionDays={auditRetention}
                    emailLogRetentionDays={emailLogRetention}
                    internalSchedulerEnabled={
                      cronSettings.internalSchedulerEnabled
                    }
                    cronLastRun={cronLastRun}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="storage" className="mt-4 flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>File storage</CardTitle>
                  <CardDescription>
                    Configure where brand files and attachments are stored.
                    Changing providers does not migrate existing files.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StorageForm defaults={storageSettings} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email" className="mt-4 flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>SMTP</CardTitle>
                  <CardDescription>
                    Used to send password resets and, in later phases, class and
                    payment reminders. The password is encrypted at rest.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmailForm
                    smtpHost={email.smtpHost}
                    smtpPort={email.smtpPort}
                    smtpUser={email.smtpUser}
                    fromAddress={email.fromAddress}
                    fromName={email.fromName}
                    smtpPasswordConfigured={email.smtpPasswordConfigured}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health" className="mt-4 flex flex-col gap-6">
              <HealthTab />
            </TabsContent>
          </>
        ) : null}

        <TabsContent value="locations" className="mt-4 flex flex-col gap-6">
          {sp.locationError ? (
            <FlashToast variant="error" message={sp.locationError} />
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Locations</CardTitle>
              <CardDescription>
                Dojo locations belonging to the school. Students are assigned to
                one or more locations; every class runs at exactly one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LocationsManager locations={locationViews} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-4 flex flex-col gap-6">
          {sp.roleError ? (
            <FlashToast variant="error" message={sp.roleError} />
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <CardDescription>
                Define permission sets and assign them to staff accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolesManager roles={roleViews} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff accounts</CardTitle>
              <CardDescription>
                Create staff accounts and manage their role, access, and
                password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersManager
                users={staffAccounts}
                roles={roleOptions}
                currentUserId={currentUser.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit log</CardTitle>
              <CardDescription>
                Track administrative and system activity across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditForm
                result={auditLogs}
                actions={listAuditActions()}
                users={users}
                filterQuery={auditFilterQuery}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

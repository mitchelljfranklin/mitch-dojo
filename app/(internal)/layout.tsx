import { AppSidebar } from "@/components/app-sidebar";
import { AdminNavButton } from "@/components/admin-nav-button";
import { ADMIN_AREA_PERMISSIONS } from "@/lib/admin-nav";
import { hasAnyPermission } from "@/lib/permissions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";
import { PageMain } from "@/components/page-main";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ScrollLockFix } from "@/components/scroll-lock-fix";
import { Toaster } from "@/components/ui/sonner";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { IdleTimer } from "@/components/idle-timer";
import { requireUser } from "@/lib/auth";
import {
  getAppearanceSettings,
  getOperationsSettings,
  getOrganizationSettings,
} from "@/lib/settings";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { countNewTrials } from "@/lib/db/trials";

export default async function InternalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  // Sync permission helper from lib/permissions (not the async auth.ts
  // hasPermission — different signature, and the layout needs any-of logic).
  const canAccessAdmin = hasAnyPermission(
    user.permissions,
    ADMIN_AREA_PERMISSIONS,
  );
  const canStudents = hasPermission(
    user.permissions,
    PERMISSIONS.STUDENTS_VIEW,
  );
  const [organization, appearance, operations, newTrialsCount] =
    await Promise.all([
      getOrganizationSettings(),
      getAppearanceSettings(),
      getOperationsSettings(),
      canStudents ? countNewTrials() : Promise.resolve(0),
    ]);

  return (
    <>
      <ScrollLockFix />
      <IdleTimer timeoutMinutes={operations.sessionTimeoutMinutes} />
      <KeyboardShortcuts permissions={user.permissions} />
      <SidebarProvider>
        <AppSidebar
          orgName={organization.name}
          permissions={user.permissions}
          hasLogo={Boolean(appearance.logoKey)}
          logoKey={appearance.logoKey ?? ""}
          logoDarkKey={appearance.logoDarkKey ?? ""}
          newTrialsCount={newTrialsCount}
        />
        <SidebarInset>
          <header className="bg-background sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1" />
            {canAccessAdmin ? <AdminNavButton /> : null}
            <ThemeToggle />
            <UserMenu
              name={user.name ?? user.email ?? "Account"}
              email={user.email ?? ""}
              role={user.roleName}
            />
          </header>
          <PageMain pageWidth={appearance.pageWidth}>{children}</PageMain>
          <ScrollToTop />
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </>
  );
}

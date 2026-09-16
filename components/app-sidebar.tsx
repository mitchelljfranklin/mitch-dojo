"use client";

import type { ComponentType } from "react";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  CalendarClock,
  Clock,
  GraduationCap,
  HardDrive,
  HeartPulse,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Mail,
  ScrollText,
  Scroll,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
  MailOpen,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ADMIN_SECTION_GROUPS, canAccessAdminSection } from "@/lib/admin-nav";
import {
  type Permission,
  PERMISSIONS,
  hasAnyPermission,
  hasPermission,
} from "@/lib/permissions";

// Icons per admin section href — display-only concern kept out of the
// section registry (lib/admin-nav.ts is the permission source of truth).
const SECTION_ICONS: Record<string, ComponentType> = {
  "/admin/general": Building2,
  "/admin/storage": HardDrive,
  "/admin/memberships": Wallet,
  "/admin/communications": Mail,
  "/admin/email": MailOpen,
  "/admin/email-log": Inbox,
  "/admin/locations": CalendarDays,
  "/admin/users": Users,
  "/admin/roles": ShieldCheck,
  "/admin/sign-in": KeyRound,
  "/admin/audit": ScrollText,
  "/admin/scheduling": CalendarClock,
  "/admin/health": HeartPulse,
};

type AppSidebarProps = {
  orgName: string;
  permissions: string[];
  hasLogo: boolean;
  logoKey: string;
};

const MANAGE_PERMISSIONS: Permission[] = [
  PERMISSIONS.AUDIT_VIEW,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.ROLES_MANAGE,
  PERMISSIONS.SETTINGS_MANAGE,
  PERMISSIONS.API_MANAGE,
];

export function AppSidebar({
  orgName,
  permissions,
  hasLogo,
  logoKey,
}: AppSidebarProps) {
  const pathname = usePathname();
  const inAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <Sidebar>
      <SidebarHeader className="from-primary/10 via-primary/5 bg-gradient-to-b to-transparent pb-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          {hasLogo ? (
            <img
              src={`/api/brand/logo?v=${logoKey}`}
              alt={orgName}
              width={120}
              height={32}
              loading="lazy"
              className="h-8 w-auto max-w-[120px] rounded object-contain"
            />
          ) : null}
          <span className="truncate font-semibold" title={orgName}>
            {orgName}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {inAdminArea ? (
          <AdminNav permissions={permissions} />
        ) : (
          <WorkspaceNav permissions={permissions} pathname={pathname} />
        )}
      </SidebarContent>
    </Sidebar>
  );
}

type NavProps = {
  permissions: string[];
  pathname: string;
};

function WorkspaceNav({ permissions, pathname }: NavProps) {
  const dojoItems = [
    {
      title: "Students",
      href: "/students",
      icon: Users,
      permission: PERMISSIONS.STUDENTS_VIEW,
    },
    {
      title: "Trials",
      href: "/trials",
      icon: UserPlus,
      permission: PERMISSIONS.STUDENTS_VIEW,
    },
    {
      title: "Classes",
      href: "/classes",
      icon: CalendarDays,
      permission: PERMISSIONS.CLASSES_VIEW,
    },
    {
      title: "Schedule",
      href: "/classes/schedule",
      icon: Clock,
      permission: PERMISSIONS.CLASSES_VIEW,
    },
    {
      title: "Trainers",
      href: "/trainers",
      icon: Users,
      permission: PERMISSIONS.CLASSES_VIEW,
    },
    {
      title: "Belts & gradings",
      href: "/belts",
      icon: GraduationCap,
      permission: PERMISSIONS.BELTS_VIEW,
    },
    {
      title: "Memberships",
      href: "/memberships",
      icon: Wallet,
      permission: PERMISSIONS.MEMBERSHIPS_VIEW,
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      permission: PERMISSIONS.ANALYTICS_VIEW,
    },
  ].filter((item) => hasPermission(permissions, item.permission));

  const canManage = hasAnyPermission(permissions, MANAGE_PERMISSIONS);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  pathname === "/dashboard" ||
                  pathname.startsWith("/dashboard/")
                }
              >
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {dojoItems.length > 0 ? (
        <SidebarGroup>
          <SidebarGroupLabel>Dojo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dojoItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : null}

      {canManage ? (
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === "/settings" ||
                    pathname.startsWith("/settings/")
                  }
                >
                  <Link href="/admin">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : null}
    </>
  );
}

// Sync permission helpers only (lib/permissions) — the sidebar is a client
// component; the async auth.ts helper has a different signature.

function AdminNav({ permissions }: { permissions: string[] }) {
  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to workspace">
                <Link href="/dashboard">
                  <ArrowLeft />
                  <span>Back to workspace</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {ADMIN_SECTION_GROUPS.map((group) => {
        const sections = group.sections.filter((section) =>
          canAccessAdminSection(permissions, section),
        );
        if (sections.length === 0) return null;

        return (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sections.map((section) => {
                  const Icon = SECTION_ICONS[section.href] ?? Scroll;
                  return (
                    <SidebarMenuItem key={section.href}>
                      <SidebarMenuButton asChild>
                        <Link href={section.href}>
                          <Icon />
                          <span>{section.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </>
  );
}

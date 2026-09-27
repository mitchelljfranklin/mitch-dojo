"use client";

import type { ComponentType } from "react";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FileBarChart,
  FileText,
  Gauge,
  GraduationCap,
  HardDrive,
  HeartPulse,
  House,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Mail,
  Receipt,
  ScrollText,
  Scroll,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  MailOpen,
  Megaphone,
  Palette,
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
  "/admin/appearance": Palette,
  "/admin/storage": HardDrive,
  "/admin/memberships": Wallet,
  "/admin/communications": Mail,
  "/admin/documents": FileCheck2,
  "/admin/email": MailOpen,
  "/admin/templates": FileText,
  "/admin/campaigns": Megaphone,
  "/admin/email-log": Inbox,
  "/admin/locations": CalendarDays,
  "/admin/users": Users,
  "/admin/roles": ShieldCheck,
  "/admin/sign-in": Gauge,
  "/admin/audit": ScrollText,
  "/admin/scheduling": CalendarClock,
  "/admin/health": HeartPulse,
};

type AppSidebarProps = {
  orgName: string;
  permissions: string[];
  hasLogo: boolean;
  logoKey: string;
  logoDarkKey?: string;
  newTrialsCount: number;
};

const MANAGE_PERMISSIONS: Permission[] = [
  PERMISSIONS.AUDIT_VIEW,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.ROLES_MANAGE,
  PERMISSIONS.SETTINGS_MANAGE,
  // api:manage is deliberately absent: there is no API admin section yet, so
  // including it would show an Admin link that /admin then denies.
];

export function AppSidebar({
  orgName,
  permissions,
  hasLogo,
  logoKey,
  logoDarkKey = "",
  newTrialsCount,
}: AppSidebarProps) {
  const pathname = usePathname();
  const inAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <Sidebar>
      <SidebarHeader className="from-primary/10 via-primary/5 bg-gradient-to-b to-transparent pb-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          {hasLogo && logoDarkKey ? (
            <>
              {/* Primary logo (made for light backgrounds) in light mode... */}
              <img
                src={`/api/brand/logo?v=${logoKey}`}
                alt={orgName}
                width={120}
                height={32}
                loading="lazy"
                className="h-8 w-auto max-w-[120px] object-contain dark:hidden"
              />
              {/* ...dark logo in dark mode (made for dark surfaces). */}
              <img
                src={`/api/brand/logo?variant=dark&v=${logoDarkKey}`}
                alt={orgName}
                width={120}
                height={32}
                loading="lazy"
                className="hidden h-8 w-auto max-w-[120px] object-contain dark:block"
              />
            </>
          ) : hasLogo ? (
            <img
              src={`/api/brand/logo?v=${logoKey}`}
              alt={orgName}
              width={120}
              height={32}
              loading="lazy"
              className="h-8 w-auto max-w-[120px] object-contain"
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
          <WorkspaceNav
            permissions={permissions}
            pathname={pathname}
            newTrialsCount={newTrialsCount}
          />
        )}
      </SidebarContent>
    </Sidebar>
  );
}

type NavProps = {
  permissions: string[];
  pathname: string;
  newTrialsCount: number;
};

type NavItem = {
  title: string;
  href: string;
  icon: ComponentType;
  visible: boolean;
  badge?: number | null;
};

type NavGroup = {
  label: string | null;
  items: NavItem[];
};

function WorkspaceNav({ permissions, pathname, newTrialsCount }: NavProps) {
  const canManage = hasAnyPermission(permissions, MANAGE_PERMISSIONS);
  const canStudents = hasPermission(permissions, PERMISSIONS.STUDENTS_VIEW);
  const canIncidents = hasPermission(permissions, PERMISSIONS.INCIDENTS_VIEW);
  const canClasses = hasPermission(permissions, PERMISSIONS.CLASSES_VIEW);
  const canAttendance = hasPermission(permissions, PERMISSIONS.ATTENDANCE_VIEW);
  const canBelts = hasPermission(permissions, PERMISSIONS.BELTS_VIEW);
  const canMemberships = hasPermission(
    permissions,
    PERMISSIONS.MEMBERSHIPS_VIEW,
  );
  const canAnalytics = hasPermission(permissions, PERMISSIONS.ANALYTICS_VIEW);

  // Task-oriented groups: Overview (business pulse), Operations (daily
  // training), People (who trains and teaches), Management (billing and
  // configuration). Empty groups are skipped — visibility stays
  // permission-driven, never greyed out.
  const groups: NavGroup[] = [
    {
      label: "Overview",
      items: [
        {
          title: "Analytics",
          href: "/analytics",
          icon: BarChart3,
          visible: canAnalytics,
        },
        {
          title: "Reports",
          href: "/reports",
          icon: FileBarChart,
          visible: canAnalytics,
        },
      ],
    },
    {
      label: "Operations",
      items: [
        {
          title: "Schedule",
          href: "/classes/schedule",
          icon: Clock,
          visible: canClasses,
        },
        {
          title: "Classes",
          href: "/classes",
          icon: CalendarDays,
          visible: canClasses,
        },
        {
          title: "Attendance",
          href: "/attendance",
          icon: ClipboardCheck,
          visible: canAttendance,
        },
        {
          title: "Belts & Gradings",
          href: "/belts",
          icon: GraduationCap,
          visible: canBelts,
        },
      ],
    },
    {
      label: "People",
      items: [
        {
          title: "Students",
          href: "/students",
          icon: Users,
          visible: canStudents,
        },
        {
          title: "Households",
          href: "/students/households",
          icon: House,
          visible: canStudents,
        },
        {
          title: "Trials",
          href: "/trials",
          icon: UserPlus,
          visible: canStudents,
          badge: newTrialsCount > 0 ? newTrialsCount : null,
        },
        {
          title: "Compliance",
          href: "/compliance",
          icon: ShieldCheck,
          visible: canStudents,
        },
        {
          title: "Incidents",
          href: "/incidents",
          icon: ShieldAlert,
          visible: canIncidents,
        },
        {
          title: "Trainers",
          href: "/trainers",
          icon: UserCheck,
          visible: canClasses,
        },
      ],
    },
    {
      label: "Management",
      items: [
        {
          title: "Memberships",
          href: "/memberships",
          icon: Wallet,
          visible: canMemberships,
        },
        {
          title: "Invoices",
          href: "/memberships/invoices",
          icon: Receipt,
          visible: canMemberships,
        },
        {
          title: "Admin",
          href: "/admin",
          icon: Settings,
          visible: canManage,
        },
      ],
    },
  ];

  const dashboardActive =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={dashboardActive}>
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {groups.map((group) => {
        const items = group.items.filter((item) => item.visible);
        if (items.length === 0) return null;

        return (
          <SidebarGroup key={group.label}>
            {group.label ? (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  // An item is active on an exact or child match, unless a
                  // longer sibling item claims the path (Invoices claims
                  // /memberships/invoices so Memberships stays dark there).
                  const matches =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const claimedByLongerChild = items.some(
                    (other) =>
                      other.href !== item.href &&
                      other.href.startsWith(`${item.href}/`) &&
                      (pathname === other.href ||
                        pathname.startsWith(`${other.href}/`)),
                  );
                  const isActive = matches && !claimedByLongerChild;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                          {item.badge ? (
                            <span className="bg-primary text-primary-foreground ml-auto rounded-full px-2 py-0.5 text-[11px] leading-none font-medium">
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          ) : null}
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

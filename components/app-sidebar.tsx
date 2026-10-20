"use client";

import type { ComponentType } from "react";
import {
  ArrowLeft,
  BadgeCheck,
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
import { useTranslations } from "next-intl";

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
  "/admin/verifications": BadgeCheck,
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
  key: string;
  href: string;
  icon: ComponentType;
  visible: boolean;
  badge?: number | null;
};

type NavGroup = {
  key: string | null;
  items: NavItem[];
};

function WorkspaceNav({ permissions, pathname, newTrialsCount }: NavProps) {
  const translate = useTranslations("Nav");
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
      key: "overview",
      items: [
        {
          key: "analytics",
          href: "/analytics",
          icon: BarChart3,
          visible: canAnalytics,
        },
        {
          key: "reports",
          href: "/reports",
          icon: FileBarChart,
          visible: canAnalytics,
        },
      ],
    },
    {
      key: "operations",
      items: [
        {
          key: "schedule",
          href: "/classes/schedule",
          icon: Clock,
          visible: canClasses,
        },
        {
          key: "classes",
          href: "/classes",
          icon: CalendarDays,
          visible: canClasses,
        },
        {
          key: "attendance",
          href: "/attendance",
          icon: ClipboardCheck,
          visible: canAttendance,
        },
        {
          key: "belts",
          href: "/belts",
          icon: GraduationCap,
          visible: canBelts,
        },
      ],
    },
    {
      key: "people",
      items: [
        {
          key: "students",
          href: "/students",
          icon: Users,
          visible: canStudents,
        },
        {
          key: "households",
          href: "/students/households",
          icon: House,
          visible: canStudents,
        },
        {
          key: "trials",
          href: "/trials",
          icon: UserPlus,
          visible: canStudents,
          badge: newTrialsCount > 0 ? newTrialsCount : null,
        },
        {
          key: "compliance",
          href: "/compliance",
          icon: ShieldCheck,
          visible: canStudents,
        },
        {
          key: "incidents",
          href: "/incidents",
          icon: ShieldAlert,
          visible: canIncidents,
        },
        {
          key: "trainers",
          href: "/trainers",
          icon: UserCheck,
          visible: canClasses,
        },
      ],
    },
    {
      key: "management",
      items: [
        {
          key: "memberships",
          href: "/memberships",
          icon: Wallet,
          visible: canMemberships,
        },
        {
          key: "invoices",
          href: "/memberships/invoices",
          icon: Receipt,
          visible: canMemberships,
        },
        {
          key: "admin",
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
                  <span>{translate("dashboard")}</span>
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
          <SidebarGroup key={group.key}>
            {group.key ? (
              <SidebarGroupLabel>
                {translate(`groups.${group.key}`)}
              </SidebarGroupLabel>
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
                          <span>{translate(`items.${item.key}`)}</span>
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
  const translate = useTranslations("Nav");
  const translateAdmin = useTranslations("Nav.admin");

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={translate("backToWorkspace")}>
                <Link href="/dashboard">
                  <ArrowLeft />
                  <span>{translate("backToWorkspace")}</span>
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
          <SidebarGroup key={group.labelKey}>
            <SidebarGroupLabel>
              {translateAdmin(`groups.${group.labelKey}`)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sections.map((section) => {
                  const Icon = SECTION_ICONS[section.href] ?? Scroll;
                  return (
                    <SidebarMenuItem key={section.href}>
                      <SidebarMenuButton asChild>
                        <Link href={section.href}>
                          <Icon />
                          <span>
                            {translateAdmin(`sections.${section.labelKey}`)}
                          </span>
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

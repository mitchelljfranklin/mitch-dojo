"use client";

import {
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
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
import {
  type Permission,
  PERMISSIONS,
  hasAnyPermission,
  hasPermission,
} from "@/lib/permissions";

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

  const dojoItems = [
    {
      title: "Students",
      href: "/students",
      icon: Users,
      permission: PERMISSIONS.STUDENTS_VIEW,
    },
    {
      title: "Classes",
      href: "/classes",
      icon: CalendarDays,
      permission: PERMISSIONS.CLASSES_VIEW,
    },
    {
      title: "Belts & gradings",
      href: "/belts",
      icon: GraduationCap,
      permission: PERMISSIONS.BELTS_VIEW,
    },
  ].filter((item) => hasPermission(permissions, item.permission));

  const canManage = hasAnyPermission(permissions, MANAGE_PERMISSIONS);

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
                    <Link href="/settings">
                      <Settings />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
    </Sidebar>
  );
}

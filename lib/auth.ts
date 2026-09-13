import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { cache } from "react";

import "@/lib/env";
import { getClientIp } from "@/lib/client-ip";
import { logAudit } from "@/lib/db/audit";
import { verifyUserCredentials } from "@/lib/db/users";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { credentialsSchema } from "@/lib/schemas/auth";
import {
  type Permission,
  hasPermission as permissionInList,
} from "@/lib/permissions";
import { getOperationsSettings } from "@/lib/settings";
import { computeSessionExpiry } from "@/lib/session";

export async function getRolePermissions(
  roleId: string,
): Promise<{ name: string; permissions: string[] }> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { name: true, permissions: true },
  });
  return {
    name: role?.name ?? "",
    permissions: role?.permissions ?? [],
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  return {
    trustHost: true,
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    providers: [
      Credentials({
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        authorize: async (rawCredentials, request) => {
          const clientIp = request?.headers
            ? getClientIp(request.headers)
            : "unknown";
          // Honour the same admin-configured login throttle as the login form,
          // so the direct-callback path can't be used to bypass it.
          const { loginRateLimitPerMin } = await getOperationsSettings();
          if (
            !rateLimit("credentials-callback", clientIp, loginRateLimitPerMin)
          ) {
            return null;
          }

          const parsed = credentialsSchema.safeParse(rawCredentials);
          if (!parsed.success) {
            return null;
          }

          const user = await verifyUserCredentials(
            parsed.data.email,
            parsed.data.password,
          );
          if (!user || user.disabled) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            roleId: user.roleId,
          };
        },
      }),
    ],
    callbacks: {
      jwt: async ({ token, user }) => {
        const settings = await getOperationsSettings();
        const exp = computeSessionExpiry(settings.sessionTimeoutMinutes);
        if (exp !== undefined) {
          token.exp = exp;
        }

        if (user?.id) {
          token.id = user.id;
          token.roleId = user.roleId;
          await logAudit(user.id, "LOGIN");
        }

        return token;
      },

      session: async ({ session, token }) => {
        if (typeof token.id === "string") {
          session.user.id = token.id;

          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { disabled: true, roleId: true },
          });

          if (dbUser) {
            token.roleId = dbUser.roleId;
          }

          if (dbUser?.disabled) {
            session.user.roleId = "";
            session.user.roleName = "";
            session.user.permissions = [];
            return session;
          }

          // Deleted user with a stale session cookie: zero the role out so
          // requireUser can force a clean re-login instead of rendering pages
          // with empty permissions.
          if (!dbUser) {
            session.user.roleId = "";
            session.user.roleName = "";
            session.user.permissions = [];
            return session;
          }
        }

        if (typeof token.roleId === "string" && token.roleId.length > 0) {
          const role = await getRolePermissions(token.roleId);
          session.user.roleId = token.roleId;
          session.user.roleName = role.name;
          session.user.permissions = role.permissions;
        } else {
          session.user.roleId = "";
          session.user.roleName = "";
          session.user.permissions = [];
        }

        return session;
      },
    },
  };
});

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function hasPermission(permission: Permission): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? permissionInList(user.permissions, permission) : false;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!permissionInList(user.permissions, permission)) {
    redirect("/dashboard");
  }
  return user;
}

export async function requireAnyPermission(permissions: Permission[]) {
  const user = await requireUser();
  const allowed = permissions.some((permission) =>
    permissionInList(user.permissions, permission),
  );
  if (!allowed) {
    redirect("/dashboard");
  }
  return user;
}

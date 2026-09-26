import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { redirect } from "next/navigation";

import "@/lib/env";
import { getClientIp } from "@/lib/client-ip";
import { logAudit } from "@/lib/db/audit";
import { verifyUserCredentials } from "@/lib/db/users";
import { resolveSsoUser, toSsoProviderKey } from "@/lib/db/sso";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { credentialsSchema } from "@/lib/schemas/auth";
import {
  type Permission,
  hasPermission as permissionInList,
} from "@/lib/permissions";
import {
  getOperationsSettings,
  getSsoSecret,
  getSsoSettings,
} from "@/lib/settings";
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

// SSO profiles must satisfy the app's augmented User shape (roleId required);
// the real role is resolved server-side in the jwt callback, never trusted
// from the IdP.
function mapSsoProfile(roleId = "") {
  return (profile: {
    sub?: string;
    name?: string;
    email?: string;
    preferred_username?: string;
    email_verified?: boolean;
  }) => ({
    id: profile.sub ?? "",
    name: profile.name ?? profile.preferred_username ?? "",
    email: profile.email ?? "",
    // Carried through so account linking can refuse an unverified email
    // (self-registered IdP accounts must not be able to claim an existing
    // user's address). Google/Entra report this; generic OIDC may omit it.
    emailVerified: profile.email_verified,
    roleId,
  });
}

// Builds the OAuth/OIDC provider list from DB-backed settings. A provider
// joins the list only when enabled AND fully configured (client id + stored
// secret); disabled providers expose no callback route.
export async function buildSsoProviders(): Promise<Provider[]> {
  const settings = await getSsoSettings();
  const providers: Provider[] = [];

  if (settings.entraIdEnabled && settings.entraIdClientId) {
    const clientSecret = await getSsoSecret("entraId");
    if (clientSecret) {
      providers.push(
        MicrosoftEntraID({
          clientId: settings.entraIdClientId,
          clientSecret,
          profile: mapSsoProfile(),
        }),
      );
    }
  }

  if (settings.googleEnabled && settings.googleClientId) {
    const clientSecret = await getSsoSecret("google");
    if (clientSecret) {
      providers.push(
        Google({
          clientId: settings.googleClientId,
          clientSecret,
          profile: mapSsoProfile(),
        }),
      );
    }
  }

  if (settings.oidcEnabled && settings.oidcIssuer && settings.oidcClientId) {
    const clientSecret = await getSsoSecret("oidc");
    if (clientSecret) {
      providers.push({
        id: "oidc",
        name: settings.oidcName || "SSO",
        type: "oidc",
        issuer: settings.oidcIssuer,
        clientId: settings.oidcClientId,
        clientSecret,
        profile: mapSsoProfile(),
      });
    }
  }

  return providers;
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
      ...(await buildSsoProviders()),
    ],
    callbacks: {
      // Domain restriction runs before any account linking happens.
      signIn: async ({ user, account }) => {
        if (!account || account.provider === "credentials") {
          return true;
        }
        const { allowedDomain } = await getSsoSettings();
        if (!allowedDomain) {
          return true;
        }
        const email = user.email ?? "";
        return email.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`);
      },

      jwt: async ({ token, user, account }) => {
        const settings = await getOperationsSettings();
        const exp = computeSessionExpiry(settings.sessionTimeoutMinutes);
        if (exp !== undefined) {
          token.exp = exp;
        }

        if (account && account.provider !== "credentials") {
          const providerKey = toSsoProviderKey(account.provider);
          if (!providerKey || !account.providerAccountId) {
            return null;
          }
          const ssoUser = await resolveSsoUser({
            provider: providerKey,
            providerId: account.providerAccountId,
            email: user?.email,
            name: user?.name,
            emailVerified: (user as { emailVerified?: boolean } | undefined)
              ?.emailVerified,
          });
          if (!ssoUser) {
            return null;
          }
          token.id = ssoUser.id;
          token.roleId = ssoUser.roleId;
          await logAudit(ssoUser.id, "LOGIN");
          return token;
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

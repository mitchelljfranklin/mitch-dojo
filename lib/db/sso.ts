import { prisma } from "@/lib/prisma";
import { getSsoSettings } from "@/lib/settings";

// Canonical provider keys stored in SsoIdentity.provider — decoupled from
// Auth.js provider ids so renaming a provider package never orphans rows.
export const SSO_PROVIDERS = ["entraId", "google", "oidc"] as const;

export type SsoProviderKey = (typeof SSO_PROVIDERS)[number];

// Auth.js provider id → canonical key.
const AUTH_PROVIDER_MAP: Record<string, SsoProviderKey> = {
  "microsoft-entra-id": "entraId",
  google: "google",
  oidc: "oidc",
};

export function toSsoProviderKey(authProvider: string): SsoProviderKey | null {
  return AUTH_PROVIDER_MAP[authProvider] ?? null;
}

export async function findSsoUserByIdentity(
  provider: SsoProviderKey,
  providerId: string,
) {
  return prisma.ssoIdentity.findUnique({
    where: { provider_providerId: { provider, providerId } },
    include: { user: true },
  });
}

async function linkIdentity(
  userId: string,
  provider: SsoProviderKey,
  providerId: string,
) {
  await prisma.ssoIdentity.create({
    data: { userId, provider, providerId },
  });
}

function fallbackName(email: string): string {
  return email.split("@")[0] ?? email;
}

async function resolveProvisionRoleId(
  autoProvisionRoleId: string,
): Promise<string | null> {
  if (autoProvisionRoleId) {
    const role = await prisma.role.findUnique({
      where: { id: autoProvisionRoleId },
    });
    if (role) {
      return role.id;
    }
  }
  // Fall back to the seeded read-only role so a mis-deleted custom default
  // role degrades to least privilege instead of blocking every new sign-in.
  const viewer = await prisma.role.findFirst({ where: { name: "Viewer" } });
  return viewer?.id ?? null;
}

export type SsoSignIn = {
  provider: SsoProviderKey;
  providerId: string;
  email: string | null | undefined;
  name: string | null | undefined;
};

/**
 * Resolves an SSO sign-in to a local user, creating the account on first
 * sign-in (just-in-time provisioning). Returns null when sign-in must be
 * denied: unknown provider key, disabled user, missing email, or no valid
 * role available for provisioning.
 *
 * Linking order: existing identity → email match → provision. The upsert
 * makes concurrent first sign-ins race-safe (both link to one account).
 */
export async function resolveSsoUser({
  provider,
  providerId,
  email,
  name,
}: SsoSignIn) {
  if (!SSO_PROVIDERS.includes(provider)) {
    return null;
  }

  const existing = await findSsoUserByIdentity(provider, providerId);
  if (existing) {
    return existing.user.disabled ? null : existing.user;
  }

  if (!email) {
    return null;
  }

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    if (byEmail.disabled) {
      return null;
    }
    await linkIdentity(byEmail.id, provider, providerId);
    return byEmail;
  }

  const settings = await getSsoSettings();
  const roleId = await resolveProvisionRoleId(settings.autoProvisionRoleId);
  if (!roleId) {
    return null;
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: name || fallbackName(email),
      // Empty hash = passwordless: the credentials path can never match.
      passwordHash: "",
      roleId,
    },
  });
  await linkIdentity(user.id, provider, providerId);
  return user;
}

export async function hasLocalPassword(passwordHash: string): Promise<boolean> {
  return passwordHash.length > 0;
}

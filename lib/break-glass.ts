import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const BCRYPT_ROUNDS = 12;
const TOKEN_BYTES = 24;

// A break-glass token is a one-time secret that temporarily restores the
// local sign-in form while SSO-only mode is on. 24 random bytes → 48 hex
// characters; only its bcrypt hash is ever stored.
export function generateBreakGlassToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export async function hashBreakGlassToken(token: string): Promise<string> {
  return bcrypt.hash(token, BCRYPT_ROUNDS);
}

export async function verifyBreakGlassToken(
  token: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

export type LocalAuthDecision = {
  disableLocalAuth: boolean;
  ssoProviderCount: number;
  breakGlassValid: boolean;
};

/**
 * Decides whether the login page renders the local credentials form.
 *
 * - Local auth shows whenever it is not disabled — the default world.
 * - Anti-lock-out: `disableLocalAuth` is ignored while zero SSO providers
 *   are enabled, so a mis-toggled setting can never lock everyone out.
 * - A valid break-glass token restores the form even in SSO-only mode.
 */
export function shouldShowLocalAuth({
  disableLocalAuth,
  ssoProviderCount,
  breakGlassValid,
}: LocalAuthDecision): boolean {
  if (breakGlassValid) {
    return true;
  }
  if (!disableLocalAuth) {
    return true;
  }
  return ssoProviderCount === 0;
}

// Fully-configured providers (enabled + client id + stored secret), mirroring
// buildSsoProviders() and the login page's buttons — so the anti-lock-out
// rule can never disagree between the page and the credentials callback.
export function countConfiguredSsoProviders(settings: {
  entraIdEnabled: boolean;
  entraIdClientId: string;
  entraIdSecretConfigured: boolean;
  googleEnabled: boolean;
  googleClientId: string;
  googleSecretConfigured: boolean;
  oidcEnabled: boolean;
  oidcIssuer: string;
  oidcClientId: string;
  oidcSecretConfigured: boolean;
}): number {
  let count = 0;
  if (
    settings.entraIdEnabled &&
    settings.entraIdClientId &&
    settings.entraIdSecretConfigured
  ) {
    count++;
  }
  if (
    settings.googleEnabled &&
    settings.googleClientId &&
    settings.googleSecretConfigured
  ) {
    count++;
  }
  if (
    settings.oidcEnabled &&
    settings.oidcIssuer &&
    settings.oidcClientId &&
    settings.oidcSecretConfigured
  ) {
    count++;
  }
  return count;
}

// SSO-only is only truly "active" when it is switched on AND at least one
// provider is actually usable — otherwise local auth stays (anti-lock-out).
export function isSsoOnlyActive(
  disableLocalAuth: boolean,
  providerCount: number,
): boolean {
  return disableLocalAuth && providerCount > 0;
}

/**
 * The WRITE-side gate for the credentials callback (the login page's form and
 * the raw /api/auth/callback/credentials both funnel through it). Hiding the
 * form is not enough — this makes SSO-only a real control, with break-glass
 * (a short-lived server-side grant minted by a valid one-time token) as the
 * only way back in.
 */
export function shouldAllowLocalCredentials(
  disableLocalAuth: boolean,
  providerCount: number,
  breakGlassGrantValid: boolean,
): boolean {
  if (!isSsoOnlyActive(disableLocalAuth, providerCount)) {
    return true;
  }
  return breakGlassGrantValid;
}

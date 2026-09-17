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

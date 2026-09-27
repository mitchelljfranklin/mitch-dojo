import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { resolvePortalToken } from "@/lib/db/portal";

// Exchanges the emailed raw token for an httpOnly cookie, then redirects to
// the portal. Route handler (not a page) so it can set the cookie.
// Redirects use RELATIVE Location headers — deriving absolute URLs from
// request.url can hand the browser an address it refuses (ERR_ADDRESS_INVALID).
export const dynamic = "force-dynamic";

const WELCOME_EXCHANGES_PER_MIN = 10;
const PORTAL_COOKIE = "portal_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // matches the token TTL

function redirectTo(location: string): NextResponse {
  return new NextResponse(null, {
    status: 307,
    headers: { Location: location },
  });
}

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request.headers);
  if (!rateLimit("portal-welcome", clientIp, WELCOME_EXCHANGES_PER_MIN)) {
    return redirectTo("/portal?error=rate");
  }

  const rawToken = request.nextUrl.searchParams.get("token") ?? "";
  const access = await resolvePortalToken(rawToken);
  if (!access) {
    return redirectTo("/portal?error=invalid");
  }

  const response = redirectTo("/portal");
  response.cookies.set(PORTAL_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}

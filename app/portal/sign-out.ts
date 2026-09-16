"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const PORTAL_COOKIE = "portal_token";

// Plain form action: clears the portal cookie and lands on the sign-in-free
// public page.
export async function portalSignOutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_COOKIE);
  redirect("/portal");
}

"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Stores the visitor's language choice. Callers follow this with a client-side
 * router refresh so the page re-renders in the new locale without remounting
 * the form (typed values and selections survive the switch).
 */
export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
  });
}

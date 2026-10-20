import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { listBookableOptions, listBookableSessions } from "@/lib/db/trials";
import { getAppearanceSettings } from "@/lib/settings";

import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Book");
  return { title: translate("metaTitle") };
}

const BOOKING_PAGE_LOADS_PER_MIN = 20;

const BOOKING_ERROR_CODES = [
  "rate",
  "invalid",
  "contact",
  "exists",
  "full",
] as const;

type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number];

function isBookingErrorCode(
  value: string | undefined,
): value is BookingErrorCode {
  return BOOKING_ERROR_CODES.some((code) => code === value);
}

type BookPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function BookPage({ searchParams }: BookPageProps) {
  const query = await searchParams;
  const translate = await getTranslations("Book");

  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  if (!rateLimit("booking-page", clientIp, BOOKING_PAGE_LOADS_PER_MIN)) {
    return (
      <div className="mx-auto max-w-md p-8">
        <Card>
          <CardHeader>
            <CardTitle>{translate("tooManyRequestsTitle")}</CardTitle>
            <CardDescription>
              {translate("tooManyRequestsDescription")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const [{ locations, disciplines }, sessions, appearance] = await Promise.all([
    listBookableOptions(),
    listBookableSessions(),
    getAppearanceSettings(),
  ]);

  const errorCode = isBookingErrorCode(query.error) ? query.error : undefined;

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <BrandMark />
        <LocaleSwitcher />
      </div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {appearance.bookingHeadline}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {appearance.bookingDescription}
        </p>
      </div>

      {query.booked ? (
        <Card className="border-success/40 mb-4">
          <CardHeader>
            <CardTitle className="text-success">
              {translate("bookedTitle")}
            </CardTitle>
            <CardDescription>{translate("bookedDescription")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {query.error ? (
        <Card className="border-destructive/40 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive text-base">
              {translate("errorTitle")}
            </CardTitle>
            <CardDescription>
              {errorCode
                ? translate(`errors.${errorCode}`)
                : translate("errorFallback")}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          {locations.length === 0 || disciplines.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {translate("unavailable")}
            </p>
          ) : (
            <BookingForm
              locations={locations}
              disciplines={disciplines}
              sessions={sessions}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

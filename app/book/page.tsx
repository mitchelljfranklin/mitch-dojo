import { headers } from "next/headers";

import { BrandMark } from "@/components/brand-mark";
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

export const metadata = {
  title: "Book a free trial class",
};

const BOOKING_PAGE_LOADS_PER_MIN = 20;

const ERROR_MESSAGES: Record<string, string> = {
  rate: "Too many attempts from your network — please try again later.",
  invalid: "Please fill in all required fields.",
  contact: "Please leave an email address or a phone number.",
  exists:
    "We already have a booking for that student — contact us and we will sort it out.",
};

type BookPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function BookPage({ searchParams }: BookPageProps) {
  const sp = await searchParams;

  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  if (!rateLimit("booking-page", clientIp, BOOKING_PAGE_LOADS_PER_MIN)) {
    return (
      <div className="mx-auto max-w-md p-8">
        <Card>
          <CardHeader>
            <CardTitle>Too many requests</CardTitle>
            <CardDescription>
              Please wait a moment and try again.
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

  return (
    <div className="mx-auto max-w-lg p-6">
      <BrandMark />
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {appearance.bookingHeadline}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {appearance.bookingDescription}
        </p>
      </div>

      {sp.booked ? (
        <Card className="border-success/40 mb-4">
          <CardHeader>
            <CardTitle className="text-success">Booking received!</CardTitle>
            <CardDescription>
              Thank you — we will confirm your spot shortly. See you on the
              mats!
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {sp.error ? (
        <Card className="border-destructive/40 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive text-base">
              Something went wrong
            </CardTitle>
            <CardDescription>
              {ERROR_MESSAGES[sp.error] ?? "Please try again."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          {locations.length === 0 || disciplines.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Online booking is not available right now — please contact us
              directly.
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

"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function DashboardErrorPage({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const translate = useTranslations("Errors");
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {translate("title")}
      </h1>
      <p className="text-muted-foreground text-sm">
        {translate("description")}
      </p>
      <Button onClick={() => reset()}>{translate("tryAgain")}</Button>
    </div>
  );
}

import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const translate = await getTranslations("Errors");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-4xl font-semibold tracking-tight">404</h1>
      <p className="text-muted-foreground text-center text-sm">
        {translate("notFoundDescription")}
      </p>
      <Button asChild>
        <Link href="/dashboard">{translate("backToDashboard")}</Link>
      </Button>
    </div>
  );
}

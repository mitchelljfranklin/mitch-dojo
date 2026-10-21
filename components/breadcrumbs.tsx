import Link from "next/link";
import { getTranslations } from "next-intl/server";

type BreadcrumbSegment = {
  label: string;
  href?: string;
};

export async function Breadcrumbs({
  segments,
}: {
  segments: BreadcrumbSegment[];
}) {
  const translate = await getTranslations("Nav");
  const translateCommon = await getTranslations("Common");

  return (
    <nav
      aria-label={translateCommon("breadcrumb")}
      className="flex items-center gap-1.5 text-sm"
    >
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        {translate("dashboard")}
      </Link>
      {segments.map((segment) => (
        <span key={segment.label} className="flex min-w-0 items-center gap-1.5">
          <span className="text-muted-foreground">/</span>
          {segment.href ? (
            <Link
              href={segment.href}
              className="text-muted-foreground hover:text-foreground max-w-48 truncate transition-colors"
            >
              {segment.label}
            </Link>
          ) : (
            <span className="text-foreground max-w-48 truncate">
              {segment.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

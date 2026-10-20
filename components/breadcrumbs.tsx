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
  const t = await getTranslations("Nav");

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        {t("dashboard")}
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

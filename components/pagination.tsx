"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

type PaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  pageParam?: string;
  itemLabel?: string;
};

export function Pagination({
  page,
  pageSize,
  totalCount,
  pageParam = "page",
  itemLabel,
}: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Common");
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function hrefForPage(target: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set(pageParam, String(target));
    return `${pathname}?${params.toString()}`;
  }

  if (totalCount === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {t("pageOf", {
          page,
          totalPages,
          totalCount,
          itemLabel: itemLabel ?? t("items"),
        })}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefForPage(page - 1)} rel="prev">
              {t("previous")}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            {t("previous")}
          </Button>
        )}
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefForPage(page + 1)} rel="next">
              {t("next")}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            {t("next")}
          </Button>
        )}
      </div>
    </div>
  );
}

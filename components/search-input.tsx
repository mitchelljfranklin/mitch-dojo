"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { updateQueryString } from "@/lib/query-string";

type SearchInputProps = {
  placeholder?: string;
  paramName?: string;
};

const DEBOUNCE_MS = 250;

export function SearchInput({
  placeholder = "Search…",
  paramName = "q",
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  const currentValue = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    // The URL already carries this value (including on first mount), so there
    // is nothing to navigate to. This is what previously wiped filters: the
    // mount-time run rebuilt the query string from the search term alone.
    if (value === currentValue) return;

    const timeout = setTimeout(() => {
      const queryString = updateQueryString(currentQuery, {
        [paramName]: value,
        // A new search always starts from the first page.
        page: null,
      });
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [value, currentValue, currentQuery, paramName, pathname, router]);

  return (
    <Input
      type="search"
      aria-label={placeholder}
      placeholder={placeholder}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className="max-w-sm"
    />
  );
}

/**
 * Applies updates to a query string while preserving every other parameter.
 * A null or empty value removes the parameter. Filters built from separate
 * controls rely on this so changing one never drops the others.
 */
export function updateQueryString(
  currentQuery: string,
  updates: Record<string, string | null>,
): string {
  const params = new URLSearchParams(currentQuery);
  for (const [name, value] of Object.entries(updates)) {
    if (value === null || value === "") params.delete(name);
    else params.set(name, value);
  }
  return params.toString();
}

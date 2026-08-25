import { isValidCalendarDateYmd } from "@/lib/date-utils";
import { appendQueryParam } from "./query-params";
import type { DateRangeFilter, SortDir, SortRequest } from "./types";

/**
 * Parses a UTC calendar day `YYYY-MM-DD`, or undefined when missing/invalid.
 */
export function parseCalendarDateYmd(
  value: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();
  return trimmed && isValidCalendarDateYmd(trimmed) ? trimmed : undefined;
}

/**
 * Parses `asc` / `desc` (case-insensitive), or undefined when missing/invalid.
 */
export function parseSortDir(
  value: string | null | undefined,
): SortDir | undefined {
  const trimmed = value?.trim().toLowerCase();
  if (trimmed === "asc" || trimmed === "desc") {
    return trimmed;
  }

  return undefined;
}

/**
 * Parses `sortBy` against an allowlist; drops unknown values.
 */
export function parseSortBy<T extends string>(
  value: string | null | undefined,
  allowed: ReadonlySet<T>,
): T | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return allowed.has(trimmed as T) ? (trimmed as T) : undefined;
}

/**
 * Reads From/To calendar bounds for each event stem via a key getter
 * (works for `URLSearchParams.get` and Next searchParams records).
 */
export function pickDateRangeFilters<T extends string>(
  get: (key: string) => string | null | undefined,
  fields: readonly T[],
): DateRangeFilter<T> {
  const result = {} as DateRangeFilter<T>;

  for (const field of fields) {
    const fromKey = `${field}From` as keyof DateRangeFilter<T> & string;
    const toKey = `${field}To` as keyof DateRangeFilter<T> & string;
    result[fromKey] = parseCalendarDateYmd(
      get(fromKey),
    ) as DateRangeFilter<T>[typeof fromKey];
    result[toKey] = parseCalendarDateYmd(
      get(toKey),
    ) as DateRangeFilter<T>[typeof toKey];
  }

  return result;
}

/**
 * Appends `sortBy` / `sortDir` when present.
 */
export function appendSortParams(
  params: URLSearchParams,
  request: SortRequest<string>,
): void {
  appendQueryParam(params, "sortBy", request.sortBy);
  appendQueryParam(params, "sortDir", request.sortDir);
}

/**
 * Appends From/To calendar bounds for the given stems when they are valid YMD.
 */
export function appendDateRangeFilters(
  params: URLSearchParams,
  filters: object,
  fields: readonly string[],
): void {
  const record = filters as Record<string, unknown>;
  for (const field of fields) {
    const fromKey = `${field}From`;
    const toKey = `${field}To`;
    const from = record[fromKey];
    const to = record[toKey];

    if (typeof from === "string" && isValidCalendarDateYmd(from)) {
      appendQueryParam(params, fromKey, from);
    }
    if (typeof to === "string" && isValidCalendarDateYmd(to)) {
      appendQueryParam(params, toKey, to);
    }
  }
}

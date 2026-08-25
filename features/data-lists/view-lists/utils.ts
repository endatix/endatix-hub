import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";
import type {
  DataListListSortBy,
  DataListListSortDir,
  ListDataListsRequest,
} from "@/lib/endatix-api/data-lists/types";
import { tryNormalizeCultureCode } from "@/lib/localization";

export const DEFAULT_DATA_LISTS_PAGE_SIZE = 10;
export const DATA_LISTS_LIST_PATH = "/data-lists";
export const ALL_LOCALES_FILTER_VALUE = "__all_locales__";
/** `tableKey` for `BackToTableButton` / `rememberTableReturnTo` (see `lib/list-page/table-return-to`). */
export const DATA_LISTS_TABLE_KEY = "data-lists";

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ALLOWED_SORT_BY = new Set<DataListListSortBy>([
  "name",
  "createdAt",
  "modifiedAt",
  "itemsCount",
  "isActive",
]);

export interface DataListsListSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  hasLocale?: string;
  sortBy?: string;
  sortDir?: string;
  createdFrom?: string;
  createdTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
  action?: string;
}

export interface DataListsListUrlState {
  page: number;
  pageSize: number;
  search?: string;
  hasLocale?: string;
  sortBy?: DataListListSortBy;
  sortDir?: DataListListSortDir;
  createdFrom?: string;
  createdTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
  action?: string;
}

export function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function parseCalendarDateParam(
  value: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !CALENDAR_DATE_PATTERN.test(trimmed)) {
    return undefined;
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return trimmed;
}

export function parseDataListSortBy(
  value: string | null | undefined,
): DataListListSortBy | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return ALLOWED_SORT_BY.has(trimmed as DataListListSortBy)
    ? (trimmed as DataListListSortBy)
    : undefined;
}

export function parseDataListSortDir(
  value: string | null | undefined,
): DataListListSortDir | undefined {
  const trimmed = value?.trim().toLowerCase();
  if (trimmed === "asc" || trimmed === "desc") {
    return trimmed;
  }

  return undefined;
}

export function parseDataListsListParams(
  searchParams?: DataListsListSearchParams,
): ListDataListsRequest {
  const paging = parsePagedSearchParams(
    searchParams,
    DEFAULT_DATA_LISTS_PAGE_SIZE,
  );
  const search = searchParams?.search?.trim() || undefined;
  const hasLocale = parseHasLocaleFilter(searchParams?.hasLocale);
  const sortBy = parseDataListSortBy(searchParams?.sortBy);
  const sortDir = parseDataListSortDir(searchParams?.sortDir);
  const createdFrom = parseCalendarDateParam(searchParams?.createdFrom);
  const createdTo = parseCalendarDateParam(searchParams?.createdTo);
  const modifiedFrom = parseCalendarDateParam(searchParams?.modifiedFrom);
  const modifiedTo = parseCalendarDateParam(searchParams?.modifiedTo);

  return {
    ...paging,
    search,
    hasLocale,
    sortBy,
    sortDir,
    createdFrom,
    createdTo,
    modifiedFrom,
    modifiedTo,
  };
}

export function parseHasLocaleFilter(
  value: string | null | undefined,
): string | undefined {
  if (!value || value === ALL_LOCALES_FILTER_VALUE) {
    return undefined;
  }

  const seen = new Set<string>();
  const locales: string[] = [];
  for (const part of value.split(",")) {
    const normalized = tryNormalizeCultureCode(part.trim());
    if (normalized == null || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    locales.push(normalized);
  }

  return locales.length > 0 ? locales.join(",") : undefined;
}

export function parseHasLocaleFilterSet(
  value: string | null | undefined,
): Set<string> {
  const parsed = parseHasLocaleFilter(value);
  if (!parsed) {
    return new Set();
  }

  return new Set(parsed.split(","));
}

export function serializeHasLocaleFilter(
  locales: ReadonlySet<string> | readonly string[],
): string | undefined {
  const values = Array.isArray(locales) ? locales : [...locales];
  return parseHasLocaleFilter(values.join(","));
}

export function serializeDataListsListSearchParams(
  state: DataListsListUrlState,
): string {
  const params = new URLSearchParams();
  if (state.search) {
    params.set("search", state.search);
  }
  if (state.hasLocale) {
    params.set("hasLocale", state.hasLocale);
  }
  if (state.sortBy) {
    params.set("sortBy", state.sortBy);
  }
  if (state.sortDir) {
    params.set("sortDir", state.sortDir);
  }
  if (state.createdFrom) {
    params.set("createdFrom", state.createdFrom);
  }
  if (state.createdTo) {
    params.set("createdTo", state.createdTo);
  }
  if (state.modifiedFrom) {
    params.set("modifiedFrom", state.modifiedFrom);
  }
  if (state.modifiedTo) {
    params.set("modifiedTo", state.modifiedTo);
  }
  if (state.page > 1) {
    params.set("page", String(state.page));
  }
  if (state.pageSize !== DEFAULT_DATA_LISTS_PAGE_SIZE) {
    params.set("pageSize", String(state.pageSize));
  }
  if (state.action) {
    params.set("action", state.action);
  }

  return params.toString();
}

export function buildDataListsListHref(state: DataListsListUrlState): string {
  const query = serializeDataListsListSearchParams(state);
  return query ? `${DATA_LISTS_LIST_PATH}?${query}` : DATA_LISTS_LIST_PATH;
}

export function buildDataListDetailHref(
  dataListId: string,
  extra?: { action?: string },
): string {
  const params = new URLSearchParams();
  if (extra?.action) {
    params.set("action", extra.action);
  }

  const query = params.toString();
  const path = `${DATA_LISTS_LIST_PATH}/${dataListId}`;
  return query ? `${path}?${query}` : path;
}

/**
 * Re-parses a raw list query string through the list's own whitelist
 * (paging clamped, `hasLocale` culture-code validated, unknown keys
 * dropped). Pass to `BackToTableButton`'s `parse` prop — see
 * `lib/list-page/table-return-to`.
 */
export function parseDataListsReturnQuery(query: string): string {
  return currentDataListsListQuery(new URLSearchParams(query));
}

/** Builds `/data-lists?<query>` from an already-validated query string. */
export function dataListsListHrefFromQuery(query: string): string {
  return query ? `${DATA_LISTS_LIST_PATH}?${query}` : DATA_LISTS_LIST_PATH;
}

function urlStateFromParsed(
  parsed: ListDataListsRequest,
): DataListsListUrlState {
  return {
    page: parsed.page ?? 1,
    pageSize: parsed.pageSize ?? DEFAULT_DATA_LISTS_PAGE_SIZE,
    search: parsed.search,
    hasLocale: parsed.hasLocale,
    sortBy: parsed.sortBy,
    sortDir: parsed.sortDir,
    createdFrom: parsed.createdFrom,
    createdTo: parsed.createdTo,
    modifiedFrom: parsed.modifiedFrom,
    modifiedTo: parsed.modifiedTo,
  };
}

export function parseDataListsReturnHref(from: string | undefined): string {
  if (!from) {
    return DATA_LISTS_LIST_PATH;
  }

  const raw = new URLSearchParams(from);
  const parsed = parseDataListsListParams({
    page: firstString(raw.get("page") ?? undefined),
    pageSize: firstString(raw.get("pageSize") ?? undefined),
    search: firstString(raw.get("search") ?? undefined),
    hasLocale: firstString(raw.get("hasLocale") ?? undefined),
    sortBy: firstString(raw.get("sortBy") ?? undefined),
    sortDir: firstString(raw.get("sortDir") ?? undefined),
    createdFrom: firstString(raw.get("createdFrom") ?? undefined),
    createdTo: firstString(raw.get("createdTo") ?? undefined),
    modifiedFrom: firstString(raw.get("modifiedFrom") ?? undefined),
    modifiedTo: firstString(raw.get("modifiedTo") ?? undefined),
  });

  return buildDataListsListHref(urlStateFromParsed(parsed));
}

export function currentDataListsListQuery(
  searchParams: URLSearchParams,
): string {
  return serializeDataListsListSearchParams(
    urlStateFromParsed(
      parseDataListsListParams({
        page: searchParams.get("page") ?? undefined,
        pageSize: searchParams.get("pageSize") ?? undefined,
        search: searchParams.get("search") ?? undefined,
        hasLocale: searchParams.get("hasLocale") ?? undefined,
        sortBy: searchParams.get("sortBy") ?? undefined,
        sortDir: searchParams.get("sortDir") ?? undefined,
        createdFrom: searchParams.get("createdFrom") ?? undefined,
        createdTo: searchParams.get("createdTo") ?? undefined,
        modifiedFrom: searchParams.get("modifiedFrom") ?? undefined,
        modifiedTo: searchParams.get("modifiedTo") ?? undefined,
      }),
    ),
  );
}

export function listUrlStateFromSearchParams(
  searchParams: URLSearchParams,
): DataListsListUrlState {
  return urlStateFromParsed(
    parseDataListsListParams({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      hasLocale: searchParams.get("hasLocale") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortDir: searchParams.get("sortDir") ?? undefined,
      createdFrom: searchParams.get("createdFrom") ?? undefined,
      createdTo: searchParams.get("createdTo") ?? undefined,
      modifiedFrom: searchParams.get("modifiedFrom") ?? undefined,
      modifiedTo: searchParams.get("modifiedTo") ?? undefined,
    }),
  );
}

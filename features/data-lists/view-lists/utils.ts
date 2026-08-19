import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";
import type { ListDataListsRequest } from "@/lib/endatix-api/data-lists/types";
import { tryNormalizeCultureCode } from "@/lib/localization";

export const DEFAULT_DATA_LISTS_PAGE_SIZE = 10;
export const DATA_LISTS_LIST_PATH = "/data-lists";
export const ALL_LOCALES_FILTER_VALUE = "__all_locales__";

export interface DataListsListSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  hasLocale?: string;
  action?: string;
  from?: string;
}

export interface DataListsListUrlState {
  page: number;
  pageSize: number;
  search?: string;
  hasLocale?: string;
  action?: string;
}

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function parseDataListsListParams(
  searchParams?: DataListsListSearchParams,
): ListDataListsRequest {
  const paging = parsePagedSearchParams(searchParams, DEFAULT_DATA_LISTS_PAGE_SIZE);
  const search = searchParams?.search?.trim() || undefined;
  const hasLocale = parseHasLocaleFilter(searchParams?.hasLocale);

  return {
    ...paging,
    query: search,
    hasLocale,
  };
}

export function parseHasLocaleFilter(
  value: string | null | undefined,
): string | undefined {
  if (!value || value === ALL_LOCALES_FILTER_VALUE) {
    return undefined;
  }

  return tryNormalizeCultureCode(value) ?? undefined;
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
  listQuery: string,
  extra?: { action?: string },
): string {
  const params = new URLSearchParams();
  if (listQuery) {
    params.set("from", listQuery);
  }
  if (extra?.action) {
    params.set("action", extra.action);
  }

  const query = params.toString();
  const path = `${DATA_LISTS_LIST_PATH}/${dataListId}`;
  return query ? `${path}?${query}` : path;
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
  });

  return buildDataListsListHref({
    page: parsed.page ?? 1,
    pageSize: parsed.pageSize ?? DEFAULT_DATA_LISTS_PAGE_SIZE,
    search: parsed.query,
    hasLocale: parsed.hasLocale,
  });
}

export function currentDataListsListQuery(searchParams: URLSearchParams): string {
  return serializeDataListsListSearchParams({
    page: Number(searchParams.get("page") ?? 1) || 1,
    pageSize:
      Number(searchParams.get("pageSize") ?? DEFAULT_DATA_LISTS_PAGE_SIZE) ||
      DEFAULT_DATA_LISTS_PAGE_SIZE,
    search: searchParams.get("search")?.trim() || undefined,
    hasLocale: parseHasLocaleFilter(searchParams.get("hasLocale")),
  });
}

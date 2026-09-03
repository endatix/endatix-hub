import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";
import type {
  ListPlatformTenantsRequest,
  PlatformTenantListSortBy,
} from "@/lib/endatix-api/platform-tenants/types";
import {
  parseSortBy,
  parseSortDir,
  pickDateRangeFilters,
} from "@/lib/endatix-api/shared/list-query";
import type { SortDir } from "@/lib/endatix-api/shared/types";
import type { SearchParam } from "@/lib/utils/next-utils";
import type { PlatformTenantSearchParams } from "../types";

export const DEFAULT_TENANTS_PAGE_SIZE = 10;

const ALLOWED_SORT_BY = new Set<PlatformTenantListSortBy>([
  "name",
  "createdAt",
  "modifiedAt",
]);

export interface TenantsListUrlState {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: PlatformTenantListSortBy;
  sortDir?: SortDir;
  createdFrom?: string;
  createdTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
}

export function firstSearchParam(value: SearchParam): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function parsePlatformTenantListParams(
  searchParams?: PlatformTenantSearchParams,
): ListPlatformTenantsRequest {
  const search = firstSearchParam(searchParams?.search)?.trim() || undefined;
  const paging = parsePagedSearchParams(
    {
      page: firstSearchParam(searchParams?.page),
      pageSize: firstSearchParam(searchParams?.pageSize),
    },
    DEFAULT_TENANTS_PAGE_SIZE,
  );
  const dateFilters = pickDateRangeFilters(
    (key) =>
      firstSearchParam(searchParams?.[key as keyof PlatformTenantSearchParams]),
    ["created", "modified"] as const,
  );

  return {
    ...paging,
    search,
    sortBy: parseSortBy(
      firstSearchParam(searchParams?.sortBy),
      ALLOWED_SORT_BY,
    ),
    sortDir: parseSortDir(firstSearchParam(searchParams?.sortDir)),
    ...dateFilters,
  };
}

export function listUrlStateFromSearchParams(
  searchParams: URLSearchParams,
): TenantsListUrlState {
  const parsed = parsePlatformTenantListParams({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortDir: searchParams.get("sortDir") ?? undefined,
    createdFrom: searchParams.get("createdFrom") ?? undefined,
    createdTo: searchParams.get("createdTo") ?? undefined,
    modifiedFrom: searchParams.get("modifiedFrom") ?? undefined,
    modifiedTo: searchParams.get("modifiedTo") ?? undefined,
  });

  return {
    page: parsed.page ?? 1,
    pageSize: parsed.pageSize ?? DEFAULT_TENANTS_PAGE_SIZE,
    search: parsed.search,
    sortBy: parsed.sortBy,
    sortDir: parsed.sortDir,
    createdFrom: parsed.createdFrom,
    createdTo: parsed.createdTo,
    modifiedFrom: parsed.modifiedFrom,
    modifiedTo: parsed.modifiedTo,
  };
}

export function tenantsListSuspenseKey(state: TenantsListUrlState): string {
  return [
    state.page,
    state.pageSize,
    state.search ?? "",
    state.sortBy ?? "",
    state.sortDir ?? "",
    state.createdFrom ?? "",
    state.createdTo ?? "",
    state.modifiedFrom ?? "",
    state.modifiedTo ?? "",
  ].join("|");
}

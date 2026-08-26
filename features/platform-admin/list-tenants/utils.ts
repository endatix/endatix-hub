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

export function parsePlatformTenantListParams(
  searchParams?: PlatformTenantSearchParams,
): ListPlatformTenantsRequest {
  const paging = parsePagedSearchParams(
    searchParams,
    DEFAULT_TENANTS_PAGE_SIZE,
  );
  const dateFilters = pickDateRangeFilters(
    (key) => searchParams?.[key as keyof PlatformTenantSearchParams],
    ["created", "modified"] as const,
  );

  return {
    ...paging,
    search: searchParams?.search?.trim() || undefined,
    sortBy: parseSortBy(searchParams?.sortBy, ALLOWED_SORT_BY),
    sortDir: parseSortDir(searchParams?.sortDir),
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

import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";
import type { ListDataListItemsRequest } from "@/lib/endatix-api/data-lists/types";

export const DEFAULT_DATA_LIST_ITEMS_PAGE_SIZE = 25;

export interface DataListItemsSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
}

export function parseDataListItemsParams(
  searchParams?: DataListItemsSearchParams,
): ListDataListItemsRequest {
  const paging = parsePagedSearchParams(
    searchParams,
    DEFAULT_DATA_LIST_ITEMS_PAGE_SIZE,
  );
  const search = searchParams?.search?.trim() || undefined;

  return {
    ...paging,
    query: search,
  };
}

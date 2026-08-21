import { parsePagedSearchParams } from '@/lib/list-page/parse-paged-search-params';
import type { ListDataListItemsRequest } from '@/lib/endatix-api/data-lists/types';
import { parseHasLocaleFilter } from '../view-lists/utils';

export const DEFAULT_DATA_LIST_ITEMS_PAGE_SIZE = 25;

export interface DataListItemsSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  hasLocale?: string;
}

export function parseDataListItemsParams(
  searchParams?: DataListItemsSearchParams,
): ListDataListItemsRequest & { hasLocale?: string } {
  const paging = parsePagedSearchParams(
    searchParams,
    DEFAULT_DATA_LIST_ITEMS_PAGE_SIZE,
  );
  const search = searchParams?.search?.trim() || undefined;
  const hasLocale = parseHasLocaleFilter(searchParams?.hasLocale);

  return {
    ...paging,
    query: search,
    hasLocale,
  };
}

/**
 * Resolve `includeLocales` for items search.
 * When `hasLocale` is set, search only those cultures; otherwise search the full catalog.
 */
export function resolveItemsIncludeLocales(options: {
  hasLocale?: string;
  availableLocales: readonly string[];
}): string[] {
  if (options.hasLocale) {
    return options.hasLocale.split(',').filter((locale) => locale.length > 0);
  }

  return [...options.availableLocales];
}

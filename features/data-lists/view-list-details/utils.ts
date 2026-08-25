import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";
import type { ListDataListItemsRequest } from "@/lib/endatix-api/data-lists/types";
import {
  parseCalendarDateParam,
  parseDataListSortDir,
  parseHasLocaleFilter,
} from "../view-lists/utils";

export const DEFAULT_DATA_LIST_ITEMS_PAGE_SIZE = 25;

const ALLOWED_ITEM_SORT_BY = new Set<
  NonNullable<ListDataListItemsRequest["sortBy"]>
>(["value", "label", "createdAt", "modifiedAt"]);

export interface DataListItemsSearchParams {
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
}

export function parseDataListItemSortBy(
  value: string | null | undefined,
): ListDataListItemsRequest["sortBy"] {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return ALLOWED_ITEM_SORT_BY.has(
    trimmed as NonNullable<ListDataListItemsRequest["sortBy"]>,
  )
    ? (trimmed as NonNullable<ListDataListItemsRequest["sortBy"]>)
    : undefined;
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
    sortBy: parseDataListItemSortBy(searchParams?.sortBy),
    sortDir: parseDataListSortDir(searchParams?.sortDir),
    createdFrom: parseCalendarDateParam(searchParams?.createdFrom),
    createdTo: parseCalendarDateParam(searchParams?.createdTo),
    modifiedFrom: parseCalendarDateParam(searchParams?.modifiedFrom),
    modifiedTo: parseCalendarDateParam(searchParams?.modifiedTo),
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
    return options.hasLocale.split(",").filter((locale) => locale.length > 0);
  }

  return [...options.availableLocales];
}

/**
 * Label column keys for the items grid (`default` + culture codes).
 * When `hasLocale` is set, only selected cultures appear (default culture → `default` column).
 */
export function resolveVisibleLabelColumns(options: {
  hasLocale?: string;
  defaultLocale?: string;
  availableLocales: readonly string[];
}): string[] {
  const defaultNorm = options.defaultLocale?.trim().toLowerCase();
  const extras = options.availableLocales.filter(
    (locale) => locale.trim().toLowerCase() !== defaultNorm,
  );

  if (!options.hasLocale) {
    return ["default", ...extras];
  }

  const selected = options.hasLocale
    .split(",")
    .map((locale) => locale.trim())
    .filter((locale) => locale.length > 0);

  const columns: string[] = [];

  for (const code of selected) {
    const norm = code.toLowerCase();
    if (defaultNorm && norm === defaultNorm) {
      if (!columns.includes("default")) {
        columns.push("default");
      }
      continue;
    }

    const match = extras.find((locale) => locale.toLowerCase() === norm);
    if (match && !columns.includes(match)) {
      columns.push(match);
    }
  }

  return columns;
}

import { PagedResponse } from "./types";

const DEFAULT_PAGE_SIZE = 20;
const MIN_PAGE = 1;
const MIN_PAGE_SIZE = 1;

/**
 * Calculates total pages from total records and page size.
 * Mirrors C#: (totalRecords + pageSize - 1) / pageSize
 */
function calculateTotalPages(totalRecords: number, pageSize: number): number {
  if (totalRecords <= 0 || pageSize <= 0) {
    return 0;
  }
  return Math.ceil(totalRecords / pageSize);
}

/**
 * A normalized wrapper for paginated API responses. Focused on UI friendly properties.
 * @template T - The type of data contained in the items array.
 */
export interface NormalizedPagedResponse<T> {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: ReadonlyArray<T>;
  hasNextPage: boolean;
}

/**
 * Normalizes a paged response to a UI friendly format.
 * @template T - The type of data contained in the items array.
 * @param response - The paged response to normalize.
 * @returns The normalized paged response.
 */
export function normalizePagedResponse<T>(
  response: PagedResponse<T>,
): NormalizedPagedResponse<T> {
  if (!response || !Array.isArray(response.items)) {
    return {
      page: MIN_PAGE,
      pageSize: DEFAULT_PAGE_SIZE,
      totalRecords: 0,
      totalPages: 0,
      items: [],
      hasNextPage: false,
    };
  }

  const items = response.items;
  const hasValidPage = Number.isFinite(response.page) && response.page >= MIN_PAGE;
  const hasValidPageSize =
    Number.isFinite(response.pageSize) && response.pageSize >= MIN_PAGE_SIZE;
  const page = hasValidPage ? response.page : MIN_PAGE;
  const pageSize = hasValidPageSize ? response.pageSize : MIN_PAGE_SIZE;
  const reportedTotalRecords = Math.max(
    Number.isFinite(response.totalRecords) ? response.totalRecords : 0,
    0,
  );
  const minimumVisibleRecords =
    hasValidPage && hasValidPageSize ? (page - 1) * pageSize + items.length : 0;
  const totalRecords = Math.max(reportedTotalRecords, minimumVisibleRecords);
  const expectedTotalPages = calculateTotalPages(totalRecords, pageSize);
  const totalPages =
    Number.isFinite(response.totalPages) && response.totalPages > 0
      ? response.totalPages
      : expectedTotalPages;

  const hasNextPage = totalPages > 0 && page < totalPages;

  return {
    page,
    pageSize,
    totalRecords,
    totalPages,
    items,
    hasNextPage,
  };
}

import { PagedResponse } from "./types";

const DEFAULT_PAGE_SIZE = 20;
const MIN_PAGE = 1;
const MIN_PAGE_SIZE = 1;

function calculateTotalPages(totalRecords: number, pageSize: number): number {
  if (totalRecords <= 0 || pageSize <= 0) {
    return 0;
  }

  return Math.ceil(totalRecords / pageSize);
}

function readNonNegativeMetric(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
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
  response: PagedResponse<T> | null | undefined,
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
  const hasValidPage =
    typeof response.page === "number" &&
    Number.isFinite(response.page) &&
    response.page >= MIN_PAGE;
  const hasValidPageSize =
    typeof response.pageSize === "number" &&
    Number.isFinite(response.pageSize) &&
    response.pageSize >= MIN_PAGE_SIZE;
  const page = hasValidPage ? response.page : MIN_PAGE;
  const pageSize = hasValidPageSize ? response.pageSize : MIN_PAGE_SIZE;
  const reportedTotalRecords = readNonNegativeMetric(response.totalRecords);
  const minimumVisibleRecords =
    hasValidPage && hasValidPageSize ? (page - 1) * pageSize + items.length : 0;
  const totalRecords = Math.max(reportedTotalRecords, minimumVisibleRecords);
  const expectedTotalPages = calculateTotalPages(totalRecords, pageSize);
  const parsedTotalPages = readNonNegativeMetric(response.totalPages);
  const totalPages =
    parsedTotalPages > 0 ? parsedTotalPages : expectedTotalPages;
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

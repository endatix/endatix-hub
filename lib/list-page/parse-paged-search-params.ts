import { parseNumber } from "@/lib/utils/type-parsers";

export interface PagedSearchParams {
  page?: string;
  pageSize?: string;
}

export function parsePagedSearchParams(
  searchParams?: PagedSearchParams,
  defaultPageSize = 10,
): { page: number; pageSize: number } {
  return {
    page: parseNumber(searchParams?.page, 1),
    pageSize: parseNumber(searchParams?.pageSize, defaultPageSize),
  };
}

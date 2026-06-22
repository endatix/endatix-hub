import { parseNumber } from "@/lib/utils/type-parsers";

export interface PagedSearchParams {
  page?: string;
  pageSize?: string;
}

const toPositiveInt = (value: number, fallback: number): number =>
  Number.isFinite(value) && value >= 1 ? Math.floor(value) : fallback;

export function parsePagedSearchParams(
  searchParams?: PagedSearchParams,
  defaultPageSize = 10,
): { page: number; pageSize: number } {
  const parsedPage = parseNumber(searchParams?.page, 1);
  const parsedPageSize = parseNumber(searchParams?.pageSize, defaultPageSize);

  return {
    page: toPositiveInt(parsedPage, 1),
    pageSize: toPositiveInt(parsedPageSize, defaultPageSize),
  };
}

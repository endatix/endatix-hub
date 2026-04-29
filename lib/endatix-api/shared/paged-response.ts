export interface NormalizedPagedResponse<T> {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: T[];
  hasNextPage: boolean;
}

export interface PagedItemsEnvelope<T> {
  page: string | number;
  pageSize: string | number;
  totalRecords?: string | number;
  totalPages?: string | number;
  items: T[];
}

function toNumber(value: string | number | undefined, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

export function normalizePagedItemsResponse<T>(
  response: PagedItemsEnvelope<T>,
): NormalizedPagedResponse<T> {
  const page = Math.max(toNumber(response.page, 1), 1);
  const pageSize = Math.max(
    toNumber(response.pageSize, response.items.length),
    1,
  );
  const totalRecords = Math.max(
    toNumber(response.totalRecords, response.items.length),
    response.items.length,
  );
  const totalPages = Math.max(
    toNumber(
      response.totalPages,
      totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 1,
    ),
    1,
  );

  return {
    page,
    pageSize,
    totalRecords,
    totalPages,
    items: response.items ?? [],
    hasNextPage: page < totalPages,
  };
}

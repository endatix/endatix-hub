import type { IPagedRequest } from "./types";

type QueryParamValue = string | number | boolean | null | undefined;

type QueryParamEntry = readonly [key: string, value: QueryParamValue];

export function appendQueryParam(
  searchParams: URLSearchParams,
  key: string,
  value: QueryParamValue,
): void {
  if (value === undefined || value === null || value === "") {
    return;
  }

  searchParams.set(key, String(value));
}

/**
 * Appends multiple query params to the search params.
 * @param searchParams - The URLSearchParams object to append the query params to.
 * @param entries - An array of key-value pairs to append to the search params.
 */
export function appendQueryParams(
  searchParams: URLSearchParams,
  entries: ReadonlyArray<QueryParamEntry>,
): void {
  entries.forEach(([key, value]) => appendQueryParam(searchParams, key, value));
}

/**
 * Appends paging query params to the search params.
 * @param searchParams - The URLSearchParams object to append the query params to.
 * @param request - The paging request to append to the search params.
 * @param defaults - The default paging request to use if the request is not provided.
 */
export function appendPagingQueryParams(
  searchParams: URLSearchParams,
  request: IPagedRequest,
  defaults: IPagedRequest = {},
): void {
  appendQueryParam(searchParams, "page", request.page ?? defaults.page);
  appendQueryParam(
    searchParams,
    "pageSize",
    request.pageSize ?? defaults.pageSize,
  );
}

/**
 * Builds an endpoint with the query string.
 * @param path - The path to the endpoint.
 * @param searchParams - The URLSearchParams object to build the query string from.
 * @returns The endpoint with the query string.
 */
export function buildEndpointWithQuery(
  path: string,
  searchParams: URLSearchParams,
): string {
  const queryString = searchParams.toString();
  return queryString ? `${path}?${queryString}` : path;
}

/**
 * Builds a query endpoint with the query string.
 * @param path - The path to the endpoint.
 * @param entries - An array of key-value pairs to append to the search params.
 * @returns The query endpoint with the query string.
 */
export function buildQueryEndpoint(
  path: string,
  entries: ReadonlyArray<QueryParamEntry>,
): string {
  const searchParams = new URLSearchParams();
  appendQueryParams(searchParams, entries);
  return buildEndpointWithQuery(path, searchParams);
}

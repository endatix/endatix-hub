import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type {
  DataList,
  ListDataListsRequest,
} from "@/lib/endatix-api/data-lists/types";
import type { DataListsPage } from "@/lib/endatix-api/data-lists/data-lists";
import { ApiErrorType } from "@/lib/endatix-api/shared/api-result";
import { DataLoadError } from "@/lib/errors/data-load-error";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { collectCatalogLocales } from "./catalog-locales";

const AGGREGATE_PAGE_SIZE = 100;
const MAX_LIST_PAGES = 200;

const LIST_PAGE_MAP_OPTIONS = {
  fallbackMessage: "Failed to load data lists.",
  logMessage: "Failed to load data lists.",
  loggerName: "data-lists.list",
} as const;

const LOCALES_MAP_OPTIONS = {
  fallbackMessage: "Failed to load data list locales.",
  logMessage: "Failed to load data list locales.",
  loggerName: "data-lists.locales",
} as const;

/** 404/400 from pre-e966 APIs that bind GET /data-lists/locales as GetById(Int64). */
const LEGACY_LOCALES_ROUTE_ERROR_TYPES: ReadonlySet<ApiErrorType> = new Set([
  ApiErrorType.NotFoundError,
  ApiErrorType.ValidationError,
]);

export async function getDataListsPage(
  request: ListDataListsRequest,
): Promise<DataListsPage> {
  const api = await requireDataListsApi();
  return fetchDataListsPage(api, request);
}

/** Distinct cultures from list aggregates. Prefers GET /data-lists/locales. */
export async function getDataListLocales(): Promise<string[]> {
  const api = await requireDataListsApi();
  const response = await api.dataLists.listLocales();

  if (response.success) {
    return response.data;
  }

  if (LEGACY_LOCALES_ROUTE_ERROR_TYPES.has(response.error.type)) {
    return collectCatalogLocales(await fetchAllDataListPages(api));
  }

  const result = toResult(response, LOCALES_MAP_OPTIONS);
  if (Result.isError(result)) {
    throw new DataLoadError(result.message);
  }

  throw new DataLoadError(LOCALES_MAP_OPTIONS.fallbackMessage);
}

async function requireDataListsApi(): Promise<EndatixApi> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();
  return new EndatixApi(session?.accessToken);
}

async function fetchDataListsPage(
  api: EndatixApi,
  request: ListDataListsRequest,
): Promise<DataListsPage> {
  const result = toResult(
    await api.dataLists.list(request),
    LIST_PAGE_MAP_OPTIONS,
  );
  if (Result.isError(result)) {
    throw new DataLoadError(result.message);
  }

  return result.value;
}

/** Every tenant data list (Creator dropdowns, locales fallback). Caps pages. */
export async function listAllDataLists(): Promise<DataList[]> {
  return fetchAllDataListPages(await requireDataListsApi());
}

async function fetchAllDataListPages(api: EndatixApi): Promise<DataList[]> {
  const allItems: DataList[] = [];

  for (let page = 1; page <= MAX_LIST_PAGES; page += 1) {
    const paged = await fetchDataListsPage(api, {
      page,
      pageSize: AGGREGATE_PAGE_SIZE,
    });
    allItems.push(...paged.items);
    if (paged.items.length === 0 || !paged.hasNextPage) {
      return allItems;
    }
  }

  throw new DataLoadError(
    `Failed to load all data lists: exceeded ${MAX_LIST_PAGES} pages.`,
  );
}

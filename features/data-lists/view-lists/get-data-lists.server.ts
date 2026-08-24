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

const AGGREGATE_PAGE_SIZE = 100;

export async function getDataListsPage(
  request: ListDataListsRequest,
): Promise<DataListsPage> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(await api.dataLists.list(request), {
    fallbackMessage: "Failed to load data lists.",
    logMessage: "Failed to load data lists.",
    loggerName: "data-lists.list",
  });

  if (Result.isError(result)) {
    throw new DataLoadError(result.message);
  }

  return result.value;
}

/** Response shapes an older (pre-e966) API returns when it binds "locales" as GetById(Int64) instead of the dedicated locales route. */
const LEGACY_API_FALLBACK_ERROR_TYPES: ReadonlySet<ApiErrorType> = new Set([
  ApiErrorType.NotFoundError,
  ApiErrorType.ValidationError,
]);

/** Distinct culture codes from tenant data-list catalogs (unfiltered by list query). */
export async function getDataListLocales(): Promise<string[]> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const response = await api.dataLists.listLocales();

  if (response.success) {
    return response.data;
  }

  // GET /data-lists/locales is OSS e966+. Older APIs bind "locales" as GetById
  // (Int64), which fails route/model binding as 404/400 -- fall back to
  // aggregating every list only for that specific, expected failure shape.
  // Any other failure (auth, server error, network) should surface as a real
  // error instead of silently degrading into an expensive full-tenant scan.
  if (!LEGACY_API_FALLBACK_ERROR_TYPES.has(response.error.type)) {
    const result = toResult(response, {
      fallbackMessage: "Failed to load data list locales.",
      logMessage: "Failed to load data list locales.",
      loggerName: "data-lists.locales",
    });
    // `response` is a failure, so `result` is always Result.error here.
    throw new DataLoadError(
      Result.isError(result)
        ? result.message
        : "Failed to load data list locales.",
    );
  }

  return collectCatalogLocales(await getAllDataLists());
}

/** Aggregates every data list across all pages (fallback for pre-e966 APIs without GET /data-lists/locales). */
async function getAllDataLists(
  request: Omit<ListDataListsRequest, "page" | "pageSize"> = {},
): Promise<DataList[]> {
  const allItems: DataList[] = [];
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages) {
    const page = await getDataListsPage({
      ...request,
      page: currentPage,
      pageSize: AGGREGATE_PAGE_SIZE,
    });

    allItems.push(...page.items);
    totalPages = Math.max(page.totalPages, 1);
    currentPage += 1;
  }

  return allItems;
}

function collectCatalogLocales(lists: readonly DataList[]): string[] {
  const seen = new Set<string>();
  for (const list of lists) {
    if (list.defaultLocale) {
      seen.add(list.defaultLocale);
    }
    for (const locale of list.availableLocales ?? []) {
      seen.add(locale);
    }
  }

  return [...seen].sort((left, right) => left.localeCompare(right));
}

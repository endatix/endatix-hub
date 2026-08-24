import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type {
  DataList,
  ListDataListsRequest,
} from "@/lib/endatix-api/data-lists/types";
import type { DataListsPage } from "@/lib/endatix-api/data-lists/data-lists";
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

/**
 * Aggregates every data list across all pages.
 *
 * Hub's management grid uses {@link getDataListsPage} (one page).
 * The Creator catalog picker still needs the full collection until
 * `edxDataListId` is wired to {@link getDataListsPage} + search as a
 * property-grid lazy provider.
 */
export async function getAllDataLists(
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

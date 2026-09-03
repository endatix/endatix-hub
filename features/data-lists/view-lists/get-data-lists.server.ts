import type { DataListsPage } from "@/lib/endatix-api/data-lists/data-lists";
import type { ListDataListsRequest } from "@/lib/endatix-api/data-lists/types";
import { DataLoadError } from "@/lib/errors/data-load-error";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { requireDataListsApi } from "../data-lists-api.server";

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

export async function getDataListsPageResult(
  request: ListDataListsRequest,
): Promise<Result<DataListsPage>> {
  const api = await requireDataListsApi();
  return toResult(await api.dataLists.list(request), LIST_PAGE_MAP_OPTIONS);
}

export async function getDataListsPage(
  request: ListDataListsRequest,
): Promise<DataListsPage> {
  const result = await getDataListsPageResult(request);
  if (Result.isError(result)) {
    throw new DataLoadError(result.message, {
      traceId: result.traceId,
      errorCode: result.errorCode,
      statusCode: result.statusCode,
    });
  }

  return result.value;
}

/** Distinct cultures from GET /data-lists/locales. */
export async function getDataListLocales(): Promise<string[]> {
  const api = await requireDataListsApi();
  const result = toResult(
    await api.dataLists.listLocales(),
    LOCALES_MAP_OPTIONS,
  );
  if (Result.isError(result)) {
    throw new DataLoadError(result.message, {
      traceId: result.traceId,
      errorCode: result.errorCode,
      statusCode: result.statusCode,
    });
  }

  return result.value;
}

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { ListDataListsRequest } from "@/lib/endatix-api/data-lists/types";
import type { DataListsPage } from "@/lib/endatix-api/data-lists/data-lists";
import { DataLoadError } from "@/lib/errors/data-load-error";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

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

export async function getDataListsPage(
  request: ListDataListsRequest,
): Promise<DataListsPage> {
  const api = await requireDataListsApi();
  return fetchDataListsPage(api, request);
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
    throw new DataLoadError(result.message, {
      traceId: result.traceId,
      errorCode: result.errorCode,
      statusCode: result.statusCode,
    });
  }

  return result.value;
}

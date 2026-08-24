import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { ListDataListsRequest } from "@/lib/endatix-api/data-lists/types";
import type { DataListsPage } from "@/lib/endatix-api/data-lists/data-lists";
import { DataLoadError } from "@/lib/errors/data-load-error";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

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

/** Distinct culture codes from tenant data-list catalogs (unfiltered by list query). */
export async function getDataListLocales(): Promise<string[]> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(await api.dataLists.listLocales(), {
    fallbackMessage: "Failed to load data list locales.",
    logMessage: "Failed to load data list locales.",
    loggerName: "data-lists.locales",
  });

  if (Result.isSuccess(result)) {
    return result.value;
  }

  // GET /data-lists/locales is OSS e966+. Older APIs bind "locales" as GetById (Int64).
  return collectCatalogLocales(await getAllDataLists());
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

"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { DATA_LIST_MAX_ITEMS } from "@/features/data-lists/import-limits";
import { EndatixApi } from "@/lib/endatix-api";
import type { DataListItem } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import type { DataListTranslationCatalog } from "@/lib/survey-features/data-lists/use-cases/surveyjs-translation-csv";
import { validateEndatixId } from "@/lib/utils/type-validators";

const CATALOG_PAGE_SIZE = 100;
const LOGGER_NAME = "data-lists.creatorTranslations";

export type GetDataListTranslationCatalogResult =
  Result<DataListTranslationCatalog>;

export async function getDataListTranslationCatalogAction(
  dataListId: string,
): Promise<GetDataListTranslationCatalogResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const idResult = validateEndatixId(dataListId, "dataListId");
  if (Result.isError(idResult)) {
    return idResult;
  }

  const api = new EndatixApi(session?.accessToken);
  const detailsResult = toResult(
    await api.dataLists.getById(idResult.value, { includeItems: false }),
    {
      fallbackMessage: "Failed to load data list for translations.",
      logMessage: "Failed to load data list for Creator translations",
      loggerName: LOGGER_NAME,
    },
  );
  if (Result.isError(detailsResult)) {
    return detailsResult;
  }

  const includeLocales = detailsResult.value.availableLocales ?? [];
  const items: Array<{ value: string; labels: Record<string, string> }> = [];
  let page = 1;

  while (items.length < DATA_LIST_MAX_ITEMS) {
    const pageResult = toResult(
      await api.dataLists.listItems(idResult.value, {
        page,
        pageSize: CATALOG_PAGE_SIZE,
        includeLocales,
        locale: detailsResult.value.defaultLocale,
      }),
      {
        fallbackMessage: "Failed to load data list items for translations.",
        logMessage: "Failed to page data list items for Creator translations",
        loggerName: LOGGER_NAME,
      },
    );
    if (Result.isError(pageResult)) {
      return pageResult;
    }

    items.push(
      ...pageResult.value.items.map((item: DataListItem) => ({
        value: item.value,
        labels: item.labels,
      })),
    );

    if (!pageResult.value.hasNextPage || pageResult.value.items.length === 0) {
      break;
    }

    page += 1;
  }

  return Result.success({
    dataListId: idResult.value,
    name: detailsResult.value.name,
    itemsCount: detailsResult.value.itemsCount,
    defaultLocale: detailsResult.value.defaultLocale,
    availableLocales: includeLocales,
    items: items.slice(0, DATA_LIST_MAX_ITEMS),
  });
}

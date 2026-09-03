import type { DataListItemsPage } from "@/lib/endatix-api/data-lists/data-lists";
import type { ListDataListItemsRequest } from "@/lib/endatix-api/data-lists/types";
import { DataLoadError } from "@/lib/errors/data-load-error";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { requireDataListsApi } from "../data-lists-api.server";

export async function getDataListItemsPage(
  dataListId: string,
  request: ListDataListItemsRequest,
): Promise<DataListItemsPage> {
  const api = await requireDataListsApi();
  const result = toResult(await api.dataLists.listItems(dataListId, request), {
    fallbackMessage: "Failed to load data list items.",
    logMessage: "Failed to load data list items.",
    loggerName: "data-lists.items",
  });

  if (Result.isError(result)) {
    throw new DataLoadError(result.message, {
      traceId: result.traceId,
      errorCode: result.errorCode,
      statusCode: result.statusCode,
    });
  }

  return result.value;
}

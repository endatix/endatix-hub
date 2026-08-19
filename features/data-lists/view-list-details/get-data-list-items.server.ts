import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { DataListItemsPage } from "@/lib/endatix-api/data-lists/data-lists";
import type { ListDataListItemsRequest } from "@/lib/endatix-api/data-lists/types";
import { DataLoadError } from "@/lib/errors/data-load-error";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

export async function getDataListItemsPage(
  dataListId: string,
  request: ListDataListItemsRequest,
): Promise<DataListItemsPage> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(await api.dataLists.listItems(dataListId, request), {
    fallbackMessage: "Failed to load data list items.",
    logMessage: "Failed to load data list items.",
    loggerName: "data-lists.items",
  });

  if (Result.isError(result)) {
    throw new DataLoadError(result.message);
  }

  return result.value;
}

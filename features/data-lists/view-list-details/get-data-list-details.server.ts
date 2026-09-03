import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { requireDataListsApi } from "../data-lists-api.server";

const DETAILS_MAP_OPTIONS = {
  fallbackMessage: "Failed to load data list.",
  logMessage: "Failed to load data list details.",
  loggerName: "data-lists.details",
} as const;

export async function getDataListDetails(
  dataListId: string,
  options?: { includeItems?: boolean },
): Promise<Result<DataListDetails>> {
  const idResult = validateEndatixId(dataListId, "dataListId");
  if (Result.isError(idResult)) {
    return idResult;
  }

  const api = await requireDataListsApi();
  return toResult(
    await api.dataLists.getById(idResult.value, {
      includeItems: options?.includeItems ?? false,
    }),
    {
      ...DETAILS_MAP_OPTIONS,
      mapData: (data) => ({
        ...data,
        items: data.items ?? [],
      }),
    },
  );
}

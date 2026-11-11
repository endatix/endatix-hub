"use server";

import type { DataListChoiceItem } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { requireDataListsApi } from "../data-lists-api.server";
import type { DataListItemsLocaleOptions } from "./types";

const LABEL_LOOKUP_PAGE_SIZE = 25;

const LABELS_MAP_OPTIONS = {
  fallbackMessage: "Failed to resolve data list labels.",
  logMessage: "Failed to resolve data list labels.",
  loggerName: "data-lists.designer-choices",
} as const;

/**
 * Resolves the label maps of stored choice values through the staff items
 * route, for the form designer. The route has no value filter, so each value
 * is an `Exact` query (which also matches label keys) narrowed to the item
 * whose value is equal. Values the list does not hold are left out.
 */
export async function resolveDataListItemLabelsAction(
  dataListId: string,
  values: string[],
  options: DataListItemsLocaleOptions = {},
): Promise<Result<DataListChoiceItem[]>> {
  const api = await requireDataListsApi();

  const lookups = await Promise.all(
    values.map(async (value) => {
      const result = toResult(
        await api.dataLists.listItems(dataListId, {
          ...options,
          query: value,
          matchMode: "Exact",
          page: 1,
          pageSize: LABEL_LOOKUP_PAGE_SIZE,
        }),
        LABELS_MAP_OPTIONS,
      );
      if (Result.isError(result)) {
        return result;
      }

      const match = result.value.items.find((item) => item.value === value);
      return Result.success(
        match ? { value: match.value, labels: match.labels } : null,
      );
    }),
  );

  const failure = lookups.find((lookup) => Result.isError(lookup));
  if (failure) {
    return failure;
  }

  return Result.success(
    lookups.flatMap((lookup) =>
      Result.isSuccess(lookup) && lookup.value ? [lookup.value] : [],
    ),
  );
}

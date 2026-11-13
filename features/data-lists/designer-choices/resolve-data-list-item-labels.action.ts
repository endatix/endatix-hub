"use server";

import type { EndatixApi } from "@/lib/endatix-api";
import type {
  DataListChoiceItem,
  ListDataListItemsRequest,
} from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { checkDataListsApi } from "../data-lists-api.server";
import type { DataListLabelOptions } from "@/lib/survey-features/data-lists";

const LABEL_LOOKUP_PAGE_SIZE = 25;

const LABELS_MAP_OPTIONS = {
  fallbackMessage: "Failed to resolve data list labels.",
  logMessage: "Failed to resolve data list labels.",
  loggerName: "data-lists.designer-choices",
} as const;

type ValueLookup = DataListLabelOptions & { value: string };
type LookupResult = Result<DataListChoiceItem | null>;

/**
 * Resolves the label maps of stored choice values through the staff items
 * route, for the form designer. Values the list does not hold are left out.
 */
export async function resolveDataListItemLabelsAction(
  dataListId: string,
  values: string[],
  options: DataListLabelOptions = {},
): Promise<Result<DataListChoiceItem[]>> {
  const access = await checkDataListsApi();
  if (Result.isError(access)) {
    return access;
  }
  const lookups = await Promise.all(
    values.map((value) =>
      findItem(access.value, dataListId, { ...options, value }),
    ),
  );
  return foundItems(lookups);
}

/**
 * The route has no value filter, so a value is an `Exact` query (which also
 * matches label keys) narrowed to the item whose value is equal.
 */
async function findItem(
  api: EndatixApi,
  dataListId: string,
  { value, ...options }: ValueLookup,
): Promise<LookupResult> {
  const result = toResult(
    await api.dataLists.listItems(dataListId, exactQuery(value, options)),
    LABELS_MAP_OPTIONS,
  );
  if (Result.isError(result)) {
    return result;
  }

  const match = result.value.items.find((item) => item.value === value);
  return Result.success(match ? { value, labels: match.labels } : null);
}

function exactQuery(
  value: string,
  options: DataListLabelOptions,
): ListDataListItemsRequest {
  return {
    ...options,
    query: value,
    matchMode: "Exact",
    page: 1,
    pageSize: LABEL_LOOKUP_PAGE_SIZE,
  };
}

/** One failed value falls back to its raw value; only a total failure is an error. */
function foundItems(lookups: LookupResult[]): Result<DataListChoiceItem[]> {
  const failure = lookups.find((lookup) => Result.isError(lookup));
  if (failure && lookups.every((lookup) => Result.isError(lookup))) {
    return failure;
  }

  return Result.success(
    lookups.flatMap((lookup) =>
      Result.isSuccess(lookup) && lookup.value ? [lookup.value] : [],
    ),
  );
}

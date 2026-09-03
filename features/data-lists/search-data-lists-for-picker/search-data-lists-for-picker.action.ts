"use server";

import { getDataListsPageResult } from "@/features/data-lists/view-lists/get-data-lists.server";
import type { DataListsPage } from "@/lib/endatix-api/data-lists/data-lists";
import type { ListDataListsRequest } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";

export type SearchDataListsForPickerResult = Result<DataListsPage>;

/** Paged Hub catalog search for Creator property-grid pickers. */
export async function searchDataListsForPickerAction(
  request: ListDataListsRequest = {},
): Promise<SearchDataListsForPickerResult> {
  return getDataListsPageResult(request);
}

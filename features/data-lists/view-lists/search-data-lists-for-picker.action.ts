"use server";

import type { DataListsPage } from "@/lib/endatix-api/data-lists/data-lists";
import type { ListDataListsRequest } from "@/lib/endatix-api/data-lists/types";
import { DataLoadError } from "@/lib/errors/data-load-error";
import { Result } from "@/lib/result";
import { getDataListsPage } from "./get-data-lists.server";

export type SearchDataListsForPickerResult = Result<DataListsPage>;

/** Paged Hub catalog search for Creator property-grid pickers. */
export async function searchDataListsForPickerAction(
  request: ListDataListsRequest = {},
): Promise<SearchDataListsForPickerResult> {
  try {
    return Result.success(await getDataListsPage(request));
  } catch (error) {
    if (error instanceof DataLoadError) {
      return Result.error(error.message, undefined, error.errorCode, {
        traceId: error.traceId,
        statusCode: error.statusCode,
      });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to search data lists.";
    return Result.error(message);
  }
}

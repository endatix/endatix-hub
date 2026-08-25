"use server";

import type { DataList } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { listAllDataLists } from "./get-data-lists.server";

export type GetDataListsForCreatorResult = Result<DataList[]>;

/** Loads every data list for Creator dropdowns. */
export async function getDataListsForCreatorAction(): Promise<GetDataListsForCreatorResult> {
  try {
    return Result.success(await listAllDataLists());
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch data lists for creator.";
    return Result.error(message);
  }
}

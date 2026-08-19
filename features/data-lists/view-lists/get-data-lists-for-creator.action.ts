"use server";

import type { DataList } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { getDataListsPage } from "./get-data-lists.server";

const CREATOR_PAGE_SIZE = 100;

export type GetDataListsForCreatorResult = Result<DataList[]>;

/**
 * Loads every data list for Creator dropdowns (paginates until exhausted).
 */
export async function getDataListsForCreatorAction(): Promise<GetDataListsForCreatorResult> {
  try {
    const allLists: DataList[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const pageResult = await getDataListsPage({
        page,
        pageSize: CREATOR_PAGE_SIZE,
      });
      allLists.push(...pageResult.items);
      hasNextPage = pageResult.hasNextPage;
      page += 1;
    }

    return Result.success(allLists);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch data lists for creator.";
    return Result.error(message);
  }
}

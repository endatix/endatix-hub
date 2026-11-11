"use server";

import type {
  DataListChoiceItem,
  DataListItem,
} from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { mapSkipTakeToPage } from "@/lib/survey-features/infrastructure/choices-lazy-load-page";
import { requireDataListsApi } from "../data-lists-api.server";
import type { DataListItemsRange, DataListItemsRangeRequest } from "./types";

const LIST_ITEMS_MAP_OPTIONS = {
  fallbackMessage: "Failed to load data list items.",
  logMessage: "Failed to load data list items.",
  loggerName: "data-lists.designer-choices",
} as const;

function toChoiceItem(item: DataListItem): DataListChoiceItem {
  return { value: item.value, labels: item.labels };
}

/**
 * Reads a `skip`/`take` window of a data list through the staff items route
 * (`GET data-lists/{id}/items`, Forms View), so the form designer previews a
 * list binding before the form is saved. A window that does not start on a
 * page boundary reads the two pages that cover it.
 */
export async function searchDataListItemsAction(
  dataListId: string,
  request: DataListItemsRangeRequest,
): Promise<Result<DataListItemsRange>> {
  const { skip, take, ...filters } = request;
  const { page, pageSize } = mapSkipTakeToPage(skip, take);
  const offset = Math.max(skip, 0) % pageSize;
  const api = await requireDataListsApi();

  const readPage = async (pageNumber: number) =>
    toResult(
      await api.dataLists.listItems(dataListId, {
        ...filters,
        page: pageNumber,
        pageSize,
      }),
      LIST_ITEMS_MAP_OPTIONS,
    );

  const first = await readPage(page);
  if (Result.isError(first)) {
    return first;
  }

  const items = [...first.value.items];
  if (offset > 0 && first.value.hasNextPage) {
    const next = await readPage(page + 1);
    if (Result.isError(next)) {
      return next;
    }
    items.push(...next.value.items);
  }

  return Result.success({
    items: items
      .slice(offset, offset + pageSize)
      .map((item) => toChoiceItem(item)),
    totalRecords: first.value.totalRecords,
  });
}

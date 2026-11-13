"use server";

import type { EndatixApi } from "@/lib/endatix-api";
import type { DataListItemsPage } from "@/lib/endatix-api/data-lists/data-lists";
import type {
  DataListItem,
  ListDataListItemsRequest,
} from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { mapSkipTakeToPage } from "@/lib/survey-features/infrastructure/choices-lazy-load-page";
import { checkDataListsApi } from "../data-lists-api.server";
import type { DataListItemsRange, DataListItemsRangeRequest } from "./types";

const LIST_ITEMS_MAP_OPTIONS = {
  fallbackMessage: "Failed to load data list items.",
  logMessage: "Failed to load data list items.",
  loggerName: "data-lists.designer-choices",
} as const;

type PageResult = Result<DataListItemsPage>;

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
  const access = await checkDataListsApi();
  if (Result.isError(access)) {
    return access;
  }
  const api = access.value;
  const readPage = (pageNumber: number) =>
    readItemsPage(api, dataListId, { ...filters, page: pageNumber, pageSize });

  const first = await readPage(page);
  const readsNext =
    Result.isSuccess(first) && offset > 0 && first.value.hasNextPage;
  const next = readsNext ? await readPage(page + 1) : null;
  return sliceWindow(first, next, { offset, size: pageSize });
}

async function readItemsPage(
  api: EndatixApi,
  dataListId: string,
  request: ListDataListItemsRequest,
): Promise<PageResult> {
  return toResult(
    await api.dataLists.listItems(dataListId, request),
    LIST_ITEMS_MAP_OPTIONS,
  );
}

function sliceWindow(
  first: PageResult,
  next: PageResult | null,
  { offset, size }: { offset: number; size: number },
): Result<DataListItemsRange> {
  if (Result.isError(first)) {
    return first;
  }
  if (next && Result.isError(next)) {
    return next;
  }

  const items = [...first.value.items, ...(next?.value.items ?? [])];
  return Result.success({
    items: items.slice(offset, offset + size).map((item) => toChoice(item)),
    totalRecords: first.value.totalRecords,
  });
}

function toChoice({ value, labels }: DataListItem) {
  return { value, labels };
}

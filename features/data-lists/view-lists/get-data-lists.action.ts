"use server";

import { getAllDataLists, getDataListsPage } from "./get-data-lists.server";
import type {
  DataList,
  ListDataListsRequest,
} from "@/lib/endatix-api/data-lists/types";
import type { DataListsPage } from "@/lib/endatix-api/data-lists/data-lists";

/**
 * Paged data-lists loader for Hub list UI.
 */
export async function getDataListsAction(
  request: ListDataListsRequest = {},
): Promise<DataListsPage> {
  return getDataListsPage(request);
}

/**
 * Gets all data lists via server-side aggregation.
 *
 * Still required for the Creator "Choices from data list" dropdown
 * (`edxDataListId`) and convert-inline uniqueness checks. Those use
 * Serializer `choices`, not the lazy-load handlers in creator-bindings
 * (those load *items of a bound list* via public search).
 */
export async function getAllDataListsAction(): Promise<DataList[]> {
  return getAllDataLists();
}

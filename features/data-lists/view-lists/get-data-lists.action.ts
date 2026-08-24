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
 * Gets all data lists via server-side aggregation. Used by the SurveyJS
 * Creator data-list picker, which needs the full collection rather than one Hub grid page.
 */
export async function getAllDataListsAction(): Promise<DataList[]> {
  return getAllDataLists();
}

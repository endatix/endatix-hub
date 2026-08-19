"use server";

import { getDataListsPage } from "./get-data-lists.server";
import type { ListDataListsRequest } from "@/lib/endatix-api/data-lists/types";
import type { DataListsPage } from "@/lib/endatix-api/data-lists/data-lists";

/**
 * Paged data-lists loader for Hub list UI.
 */
export async function getDataListsAction(
  request: ListDataListsRequest = {},
): Promise<DataListsPage> {
  return getDataListsPage(request);
}

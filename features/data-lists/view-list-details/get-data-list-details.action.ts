"use server";

import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { getDataListDetails } from "./get-data-list-details.server";

export type GetDataListDetailsResult = Result<DataListDetails>;

export async function getDataListDetailsAction(
  dataListId: string,
): Promise<GetDataListDetailsResult> {
  return getDataListDetails(dataListId, { includeItems: false });
}

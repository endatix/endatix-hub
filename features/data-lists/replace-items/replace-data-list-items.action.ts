"use server";

import { guardJsonImportItems } from "@/features/data-lists/import-payload-guards";
import { prepareDataListImport } from "@/features/data-lists/prepare-data-list-import";
import type {
  DataListChoiceItem,
  DataListDetails,
} from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { revalidatePath } from "next/cache";

export type ReplaceDataListItemsResult = Result<DataListDetails>;

export async function replaceDataListItemsAction(
  dataListId: string,
  items: DataListChoiceItem[],
  ensureLocales: string[] = [],
): Promise<ReplaceDataListItemsResult> {
  const prepared = await prepareDataListImport({
    dataListId,
    ensureLocales,
    payloadGuard: guardJsonImportItems(items),
    loadDetailsLogMessage: "Failed to load data list before replace",
    loggerName: "data-lists.replaceItems",
  });
  if (Result.isError(prepared)) {
    return prepared;
  }

  const result = toResult(
    await prepared.value.api.dataLists.replaceItems(
      prepared.value.dataListId,
      items,
      { ensureLocales: prepared.value.ensureLocales },
    ),
    {
      fallbackMessage: "Failed to replace data list items",
      logMessage: "Failed to replace data list items",
      loggerName: "data-lists.replaceItems",
    },
  );

  if (Result.isSuccess(result)) {
    revalidatePath(`/data-lists/${prepared.value.dataListId}`);
  }

  return result;
}

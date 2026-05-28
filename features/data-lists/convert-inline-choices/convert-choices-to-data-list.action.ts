"use server";

import { createDataListAction } from "@/features/data-lists/create-list/create-data-list.action";
import { deleteDataListAction } from "@/features/data-lists/delete-list/delete-data-list.action";
import { replaceDataListItemsAction } from "@/features/data-lists/replace-items/replace-data-list-items.action";
import { TelemetryLogger } from "@/features/telemetry";
import type {
  DataListChoiceItem,
  DataListDetails,
} from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";

export type ConvertChoicesToDataListResult = Result<{
  dataList: DataListDetails;
}>;
const LOGGER_NAME = "data-lists";

export async function convertChoicesToDataListAction(input: {
  name: string;
  description?: string;
  items: DataListChoiceItem[];
}): Promise<ConvertChoicesToDataListResult> {
  const created = await createDataListAction({
    name: input.name,
    description: input.description,
  });

  if (!Result.isSuccess(created)) {
    return created;
  }

  const replaced = await replaceDataListItemsAction(
    created.value.id,
    input.items,
  );

  if (!Result.isSuccess(replaced)) {
    try {
      await deleteDataListAction(created.value.id);
    } catch (error) {
      TelemetryLogger.error(
        `Failed to compensate data list creation for "${created.value.id}"`,
        error,
        { dataListId: created.value.id },
        LOGGER_NAME,
      );
    }
    return replaced;
  }

  return Result.success({ dataList: replaced.value });
}

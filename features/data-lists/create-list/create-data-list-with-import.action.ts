"use server";

import { deleteDataListAction } from "@/features/data-lists/delete-list/delete-data-list.action";
import { replaceDataListItemsAction } from "@/features/data-lists/replace-items/replace-data-list-items.action";
import { uploadTranslationsCsvAction } from "@/features/data-lists/translations/translations-csv.action";
import { guardImportPayload } from "@/features/data-lists/import-payload-guards";
import { TelemetryLogger } from "@/features/telemetry";
import type {
  DataListChoiceItem,
  DataListDetails,
} from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { createDataListAction } from "./create-data-list.action";

const LOGGER_NAME = "data-lists.createWithImport";

export type CreateDataListWithImportResult = Result<DataListDetails>;

export type CreateDataListWithImportInput = {
  name: string;
  description?: string;
  ensureLocales?: string[];
} & (
  | { format: "csv"; csv: string; items?: never }
  | { format: "json"; items: DataListChoiceItem[]; csv?: never }
);

async function rollBackCreatedList(dataListId: string): Promise<void> {
  try {
    const deleted = await deleteDataListAction(dataListId);
    if (Result.isError(deleted)) {
      TelemetryLogger.error(
        "Failed to roll back data list creation after import failure",
        new Error("deleteDataListAction returned an error result"),
        { dataListId },
        LOGGER_NAME,
      );
    }
  } catch (error) {
    TelemetryLogger.error(
      "Failed to roll back data list creation after import failure",
      error,
      { dataListId },
      LOGGER_NAME,
    );
  }
}

/**
 * Creates a data list and imports items in one Hub workflow.
 * Rolls back (deletes) the list if import fails so callers never leave empty orphans.
 */
export async function createDataListWithImportAction(
  input: CreateDataListWithImportInput,
): Promise<CreateDataListWithImportResult> {
  const ensureLocales = input.ensureLocales ?? [];

  const payloadGuard = guardImportPayload(
    input.format === "csv"
      ? {
          format: "csv",
          csv: input.csv,
          ensureLocales,
          catalogLocaleCount: 0,
        }
      : {
          format: "json",
          items: input.items,
          ensureLocales,
          catalogLocaleCount: 0,
        },
  );
  if (Result.isError(payloadGuard)) {
    return payloadGuard;
  }

  const created = await createDataListAction({
    name: input.name,
    description: input.description,
  });

  if (Result.isError(created)) {
    return created;
  }

  const dataListId = String(created.value.id);

  const imported =
    input.format === "csv"
      ? await uploadTranslationsCsvAction({
          dataListId,
          csv: input.csv,
          ensureLocales,
        })
      : await replaceDataListItemsAction(
          dataListId,
          input.items,
          ensureLocales,
        );

  if (Result.isError(imported)) {
    await rollBackCreatedList(dataListId);
  }

  return imported;
}

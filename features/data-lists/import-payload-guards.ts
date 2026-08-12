import type { DataListChoiceItem } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import {
  DATA_LIST_MAX_CSV_CHARS,
  DATA_LIST_MAX_ITEMS,
  DATA_LIST_MAX_LOCALES,
} from "./import-limits";
import {
  IMPORT_AT_LEAST_ONE_CSV_ROW_ERROR,
  IMPORT_AT_LEAST_ONE_ITEM_ERROR,
  IMPORT_CSV_TOO_LARGE_ERROR,
  IMPORT_LOCALES_CATALOG_LIMIT_ERROR,
  IMPORT_TOO_MANY_ITEMS_ERROR,
} from "./import-validation-messages";
import { readCsvRecords } from "./translations/parse-translations-csv";

export type GuardImportPayloadInput = {
  ensureLocales?: readonly string[];
  catalogLocaleCount?: number;
} & (
  | { format: "csv"; csv: string; items?: never }
  | { format: "json"; items: DataListChoiceItem[]; csv?: never }
);

/**
 * Shared Hub-side guards for data-list import payloads (CSV / JSON items).
 * Mirrors client discovery limits so server actions do not trust the browser alone.
 */
export function guardTranslationsCsvPayload(csv: string): Result<void> {
  if (csv.length > DATA_LIST_MAX_CSV_CHARS) {
    return Result.error(IMPORT_CSV_TOO_LARGE_ERROR);
  }

  let records: string[][];
  try {
    records = readCsvRecords(csv);
  } catch (error) {
    return Result.error(
      error instanceof Error ? error.message : "Invalid CSV format.",
    );
  }

  const dataRows = records
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim().length > 0));

  if (dataRows.length === 0) {
    return Result.error(IMPORT_AT_LEAST_ONE_CSV_ROW_ERROR);
  }

  if (dataRows.length > DATA_LIST_MAX_ITEMS) {
    return Result.error(IMPORT_TOO_MANY_ITEMS_ERROR);
  }

  return Result.success(undefined);
}

/**
 * Guard to ensure the number of items in the import payload does not exceed the maximum limit.
 */
export function guardJsonImportItems(
  items: DataListChoiceItem[],
): Result<void> {
  if (items.length === 0) {
    return Result.error(IMPORT_AT_LEAST_ONE_ITEM_ERROR);
  }

  if (items.length > DATA_LIST_MAX_ITEMS) {
    return Result.error(IMPORT_TOO_MANY_ITEMS_ERROR);
  }

  return Result.success(undefined);
}

/**
 * Guard to ensure the number of locales selected does not exceed the catalog limit.
 */
export function guardEnsureLocalesCount(
  ensureLocales: readonly string[],
  catalogLocaleCount: number,
): Result<void> {
  if (catalogLocaleCount + ensureLocales.length > DATA_LIST_MAX_LOCALES) {
    return Result.error(IMPORT_LOCALES_CATALOG_LIMIT_ERROR);
  }

  return Result.success(undefined);
}

/**
 * Single entry for create/upload/replace server actions: locales cap + format payload.
 */
export function guardImportPayload(
  input: GuardImportPayloadInput,
): Result<void> {
  const localesGuard = guardEnsureLocalesCount(
    input.ensureLocales ?? [],
    input.catalogLocaleCount ?? 0,
  );
  if (Result.isError(localesGuard)) {
    return localesGuard;
  }

  switch (input.format) {
    case "csv":
      return guardTranslationsCsvPayload(input.csv);
    case "json":
      return guardJsonImportItems(input.items);
  }
}

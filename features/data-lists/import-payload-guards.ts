import type { DataListChoiceItem } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import {
  DATA_LIST_MAX_CSV_CHARS,
  DATA_LIST_MAX_ITEMS,
  DATA_LIST_MAX_LOCALES,
} from "./translations/locale-discovery";
import { readCsvRecords } from "./translations/parse-translations-csv";

/**
 * Shared Hub-side guards for data-list import payloads (CSV / JSON items).
 * Mirrors client discovery limits so server actions do not trust the browser alone.
 */
export function guardTranslationsCsvPayload(csv: string): Result<void> {
  if (csv.length > DATA_LIST_MAX_CSV_CHARS) {
    return Result.error(
      `CSV exceeds the maximum size of ${DATA_LIST_MAX_CSV_CHARS.toLocaleString()} characters.`,
    );
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
    return Result.error("At least one data row is required.");
  }

  if (dataRows.length > DATA_LIST_MAX_ITEMS) {
    return Result.error(
      `A data list cannot have more than ${DATA_LIST_MAX_ITEMS.toLocaleString()} items.`,
    );
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
    return Result.error("At least one item is required.");
  }

  if (items.length > DATA_LIST_MAX_ITEMS) {
    return Result.error(
      `A data list cannot have more than ${DATA_LIST_MAX_ITEMS.toLocaleString()} items.`,
    );
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
    return Result.error(
      `Selecting these locales would exceed the catalog limit of ${DATA_LIST_MAX_LOCALES}.`,
    );
  }

  return Result.success(undefined);
}

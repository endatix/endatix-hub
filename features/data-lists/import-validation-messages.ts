import {
  DATA_LIST_MAX_CSV_CHARS,
  DATA_LIST_MAX_ITEMS,
  DATA_LIST_MAX_LOCALES,
} from "./import-limits";

/** Stable grouping for user-facing limits (avoids CI flakes under non–en-US locales). */
function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Shared copy for client discovery (`utils`, CSV/locale helpers) and server
 * `import-payload-guards`. Keep wording identical across Hub import paths.
 */
export const IMPORT_AT_LEAST_ONE_ITEM_ERROR = "At least one item is required.";
export const IMPORT_AT_LEAST_ONE_CSV_ROW_ERROR =
  "At least one data row is required.";
export const IMPORT_TOO_MANY_ITEMS_ERROR = `A data list cannot have more than ${formatCount(DATA_LIST_MAX_ITEMS)} items.`;
export const IMPORT_CSV_TOO_LARGE_ERROR = `CSV exceeds the maximum size of ${formatCount(DATA_LIST_MAX_CSV_CHARS)} characters.`;
export const IMPORT_LOCALES_CATALOG_LIMIT_ERROR = `Selecting these locales would exceed the catalog limit of ${DATA_LIST_MAX_LOCALES}.`;
export const IMPORT_ROLLBACK_FAILED_SUFFIX =
  "The new data list could not be removed automatically. Delete it from Data lists or contact support.";

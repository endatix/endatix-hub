import {
  DATA_LIST_MAX_CSV_CHARS,
  DATA_LIST_MAX_ITEMS,
  DATA_LIST_MAX_LOCALES,
} from "./import-limits";

/**
 * Shared copy for client discovery (`utils`, CSV/locale helpers) and server
 * `import-payload-guards`. Keep wording identical across Hub import paths.
 */
export const IMPORT_AT_LEAST_ONE_ITEM_ERROR = "At least one item is required.";
export const IMPORT_AT_LEAST_ONE_CSV_ROW_ERROR =
  "At least one data row is required.";
export const IMPORT_TOO_MANY_ITEMS_ERROR = `A data list cannot have more than ${DATA_LIST_MAX_ITEMS.toLocaleString()} items.`;
export const IMPORT_CSV_TOO_LARGE_ERROR = `CSV exceeds the maximum size of ${DATA_LIST_MAX_CSV_CHARS.toLocaleString()} characters.`;
export const IMPORT_LOCALES_CATALOG_LIMIT_ERROR = `Selecting these locales would exceed the catalog limit of ${DATA_LIST_MAX_LOCALES}.`;

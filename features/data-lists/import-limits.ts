import { DATA_LIST_ITEM_MAX_LENGTH } from "@/lib/survey-features/data-lists/constants";

/** Shared data-list import caps (client discovery + server guards). */
export const DATA_LIST_MAX_ITEMS = 5_000;
export const DATA_LIST_MAX_LOCALES = 20;
/** Alias of API max label/value length — keep UI copy and validation on one constant. */
export const DATA_LIST_MAX_LABEL_LENGTH = DATA_LIST_ITEM_MAX_LENGTH;
export const DATA_LIST_MAX_CSV_CHARS = 2_000_000;
export const DATA_LIST_MAX_JSON_FILE_BYTES = 5 * 1024 * 1024;

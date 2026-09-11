export { DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE } from "@/lib/survey-features/infrastructure/choices-lazy-load-page";

export const DATA_LIST_PROPERTY_NAME = "edxDataListId";

/** Property changes that affect aggregated property-grid lazy choice editors. */
export const PROPERTY_GRID_LAZY_REFRESH_PROPERTY_NAMES = [
  DATA_LIST_PROPERTY_NAME,
  "loopSource",
  "edxCarryForwardSources",
] as const;

/** API max length for data list item label and value. */
export const DATA_LIST_ITEM_MAX_LENGTH = 100;

/** API max length for data list name. */
export const DATA_LIST_NAME_MAX_LENGTH = 100;

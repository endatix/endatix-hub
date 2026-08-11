export const MATRIX_CAROUSEL_EXTENSION_ID = "matrix-carousel";

export const MATRIX_TYPE = "matrix";
export const ITEM_VALUE_CLASS = "itemvalue";
export const ROWS_PROPERTY_NAME = "rows";

export const IMAGE_URL_PROPERTY = "imageUrl";

// Not "displayMode" — that's already a built-in matrix/martixBase property
// ("auto"|"table"|"list", a width-based table/list responsive toggle) with a
// completely different meaning. Confirmed by test: reusing the name collides
// silently — Serializer.addProperty on an existing name does not overwrite
// its choices/default, so registration finds the property "already there"
// and no-ops the entire property block.
export const DISPLAY_MODE_PROPERTY = "edxDisplayMode";
export const SHOW_PROGRESS_INDICATOR_PROPERTY = "showProgressIndicator";
export const PROGRESS_INDICATOR_TYPE_PROPERTY = "progressIndicatorType";
export const SHOW_NAVIGATION_BUTTONS_PROPERTY = "showNavigationButtons";
export const ALLOW_SWIPE_NAVIGATION_PROPERTY = "allowSwipeNavigation";

export const EDX_ROWS_SOURCE_ENABLED_PROPERTY = "edxRowsSourceEnabled";
export const EDX_ROWS_SOURCE_QUESTION_PROPERTY = "edxRowsSourceQuestion";
export const EDX_ROWS_SOURCE_SELECTION_MODE_PROPERTY =
  "edxRowsSourceSelectionMode";

export const DISPLAY_MODE_GRID = "grid";
export const DISPLAY_MODE_CAROUSEL = "carousel";

export const PROGRESS_INDICATOR_TEXT = "text";
export const PROGRESS_INDICATOR_BAR = "bar";

export const ROWS_SOURCE_SELECTION_ALL = "all";
export const ROWS_SOURCE_SELECTION_SELECTED_ONLY = "selectedOnly";
export const ROWS_SOURCE_SELECTION_UNSELECTED_ONLY = "unselectedOnly";

/** Properties only meaningful for the grid table layout — hidden (not removed) in the property grid while displayMode is "carousel". */
export const GRID_ONLY_PROPERTIES = [
  "showHeader",
  "verticalAlign",
  "alternateRows",
  "columnMinWidth",
  "rowTitleWidth",
];

export const MATRIX_CAROUSEL_HANDLERS_ATTACHED_KEY =
  "__endatixMatrixCarouselHandlersAttached";
export const MATRIX_CAROUSEL_ROW_SOURCE_ATTACHED_KEY =
  "__endatixMatrixCarouselRowSourceAttached";
export const MATRIX_CAROUSEL_CREATOR_BOUND_KEY =
  "__endatixMatrixCarouselCreatorBound";

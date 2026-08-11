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
// edx-prefixed like every other custom property this feature adds to the
// existing matrix type (edxDisplayMode, edxCarryForward*) — not because
// these two specific names currently collide with a SurveyJS built-in (they
// don't, checked against the installed survey-core bundle), but because
// edxDisplayMode already got burned once by an unprefixed name silently
// colliding with a future/existing built-in (see its own comment above), and
// every other survey-feature that extends an existing type (carry-forward,
// blind-search-tagbox) follows this prefix unconditionally rather than
// checking case-by-case.
export const SHOW_PROGRESS_INDICATOR_PROPERTY = "edxShowProgressIndicator";
export const PROGRESS_INDICATOR_TYPE_PROPERTY = "edxProgressIndicatorType";

export const DISPLAY_MODE_GRID = "grid";
export const DISPLAY_MODE_CAROUSEL = "carousel";

export const PROGRESS_INDICATOR_TEXT = "text";
export const PROGRESS_INDICATOR_BAR = "bar";

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

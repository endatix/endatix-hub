import { getLocaleStrings } from "survey-creator-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import { bindSurveyToCreatorAreas } from "@/lib/survey-features/infrastructure/creator-survey-bindings";
import {
  ALLOW_SWIPE_NAVIGATION_PROPERTY,
  DISPLAY_MODE_PROPERTY,
  EDX_ROWS_SOURCE_ENABLED_PROPERTY,
  EDX_ROWS_SOURCE_QUESTION_PROPERTY,
  EDX_ROWS_SOURCE_SELECTION_MODE_PROPERTY,
  IMAGE_URL_PROPERTY,
  MATRIX_CAROUSEL_CREATOR_BOUND_KEY,
  PROGRESS_INDICATOR_TYPE_PROPERTY,
  SHOW_NAVIGATION_BUTTONS_PROPERTY,
  SHOW_PROGRESS_INDICATOR_PROPERTY,
} from "../constants";
import { bindMatrixCarouselRowSourceToSurvey, bindMatrixCarouselToSurvey } from "./survey-bindings";

let isCreatorHelpRegistered = false;

/**
 * Property-grid help text for the carousel/row-source properties. Mirrors
 * carry-forward's own registerAdvancedCarryForwardCreatorHelp (same
 * getLocaleStrings("en").pehelp mechanism).
 */
export function registerMatrixCarouselCreatorHelp(): void {
  if (isCreatorHelpRegistered) {
    return;
  }

  const translations = getLocaleStrings("en");

  translations.pehelp[DISPLAY_MODE_PROPERTY] =
    "Grid shows all statements in a table. Carousel shows one statement at a time, swipeable on mobile, sharing the same scale across every statement.";

  translations.pehelp[SHOW_PROGRESS_INDICATOR_PROPERTY] =
    'Shows "1 of N" text or a progress bar above the carousel as respondents move through the statements.';

  translations.pehelp[PROGRESS_INDICATOR_TYPE_PROPERTY] =
    "Choose plain text (\"1 of N\") or a filled progress bar.";

  translations.pehelp[SHOW_NAVIGATION_BUTTONS_PROPERTY] =
    "Back/Next buttons as a non-swipe alternative — recommended for desktop and accessibility.";

  translations.pehelp[ALLOW_SWIPE_NAVIGATION_PROPERTY] =
    "Lets respondents swipe between statements on touch devices. Turn off for kiosk or kept-to-buttons flows.";

  translations.pehelp[EDX_ROWS_SOURCE_ENABLED_PROPERTY] =
    "Builds this question's statements from another question's choices instead of the manually-authored list below. Enabling this overwrites the Rows you've entered.";

  translations.pehelp[EDX_ROWS_SOURCE_QUESTION_PROPERTY] =
    "The question to pull statements from. Only single/multi-select-type questions appear here.";

  translations.pehelp[EDX_ROWS_SOURCE_SELECTION_MODE_PROPERTY] =
    'Choose "All" for every choice, "Selected" to only include choices the respondent picked, or "Unselected" for the ones they did not.';

  translations.pehelp[IMAGE_URL_PROPERTY] =
    "Optional image shown above the statement instead of, or alongside, its text.";

  isCreatorHelpRegistered = true;
}

export function resetMatrixCarouselCreatorHelpForTests(): void {
  const translations = getLocaleStrings("en");

  delete translations.pehelp[DISPLAY_MODE_PROPERTY];
  delete translations.pehelp[SHOW_PROGRESS_INDICATOR_PROPERTY];
  delete translations.pehelp[PROGRESS_INDICATOR_TYPE_PROPERTY];
  delete translations.pehelp[SHOW_NAVIGATION_BUTTONS_PROPERTY];
  delete translations.pehelp[ALLOW_SWIPE_NAVIGATION_PROPERTY];
  delete translations.pehelp[EDX_ROWS_SOURCE_ENABLED_PROPERTY];
  delete translations.pehelp[EDX_ROWS_SOURCE_QUESTION_PROPERTY];
  delete translations.pehelp[EDX_ROWS_SOURCE_SELECTION_MODE_PROPERTY];
  delete translations.pehelp[IMAGE_URL_PROPERTY];

  isCreatorHelpRegistered = false;
}

/**
 * Binds the same survey-bindings used at runtime to Creator's designer/
 * preview survey instances, via the shared bindSurveyToCreatorAreas helper
 * (designer-tab/preview-tab only — not property grids or editor popups).
 *
 * Design-canvas rendering intentionally still uses the live scroll-snap
 * strip (no separate static-preview mode) — this keeps designer behavior
 * identical to the runner rather than adding a second rendering path, at the
 * cost of the IntersectionObserver reconciliation running during property
 * edits too. Flagged in the plan as worth a product check-in, not something
 * this pass resolves differently.
 */
export function bindMatrixCarouselToCreator(creator: SurveyCreatorModel): () => void {
  const disposeCarousel = bindSurveyToCreatorAreas(
    creator,
    MATRIX_CAROUSEL_CREATOR_BOUND_KEY,
    bindMatrixCarouselToSurvey,
  );
  const disposeRowSource = bindSurveyToCreatorAreas(
    creator,
    `${MATRIX_CAROUSEL_CREATOR_BOUND_KEY}RowSource`,
    bindMatrixCarouselRowSourceToSurvey,
  );

  return () => {
    disposeCarousel();
    disposeRowSource();
  };
}

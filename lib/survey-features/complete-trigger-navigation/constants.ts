export const COMPLETE_TRIGGER_NAVIGATION_EXTENSION_ID =
  "complete-trigger-navigation";

/**
 * `edx` prefix per the other feature-slice properties (`edxHideUntilTyping`,
 * `edxDataListId`, …). It also keeps the key off SurveyJS's own
 * `settings.triggers.changeNavigationButtonsOnComplete`: a future
 * survey-level property of that name would make `hasProperty()` in
 * `registry.ts` skip Hub's registration.
 */
export const EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY =
  "edxChangeNavigationOnComplete";

export const EDX_CHANGE_NAVIGATION_ON_COMPLETE_DISPLAY_NAME =
  "Replace Next with Complete when a complete trigger is met";

/**
 * Survey Creator places this immediately after `showPrevButton` on the
 * Navigation tab in survey-core 3.0.2. The registry test asserts that
 * resolved order, not this number — a SurveyJS bump that reorders the tab
 * must fail the test rather than silently move the checkbox.
 */
export const EDX_CHANGE_NAVIGATION_ON_COMPLETE_VISIBLE_INDEX = 7;

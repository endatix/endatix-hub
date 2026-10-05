export const COMPLETE_TRIGGER_NAVIGATION_EXTENSION_ID =
  "complete-trigger-navigation";

export const CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY =
  "changeNavigationButtonsOnComplete";

export const CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_DISPLAY_NAME =
  "Replace Next with Complete when a complete trigger is met";

/**
 * Survey Creator places this immediately after `showPrevButton` on the
 * Navigation tab in survey-core 3.0.2. The registry test asserts that
 * resolved order, not this number — a SurveyJS bump that reorders the tab
 * must fail the test rather than silently move the checkbox.
 */
export const CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_VISIBLE_INDEX = 7;

export const COMPLETE_TRIGGER_NAVIGATION_CREATOR_BOUND_KEY =
  "__endatixCompleteTriggerNavigationBound";

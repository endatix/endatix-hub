import { getLocaleStrings } from "survey-creator-core";
import { EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY } from "../constants";

/**
 * Designer-only help text. Kept in this module so the respondent graph never
 * reaches survey-creator-core; the extension imports it dynamically.
 */
export function registerCompleteTriggerNavigationPropertyHelp(): void {
  const translations = getLocaleStrings("en");
  translations.pehelp[EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY] =
    "When on, Next becomes Complete as soon as a Complete trigger's expression is true. When off, Next stays in place and moving on completes the form.";
}

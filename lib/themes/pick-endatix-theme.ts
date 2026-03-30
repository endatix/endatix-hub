import { endatixThemeDark, endatixThemeLight } from "./endatix-creator-theme";
import {
  endatixSurveyThemeDark,
  endatixSurveyThemeLight,
} from "./endatix-survey-theme";

const DARK_THEME = "dark";
/**
 * Maps `next-themes` `resolvedTheme` to Survey Creator chrome.
 * Defaults to light when theme is not yet resolved (SSR / first paint).
 */
export function pickCreatorTheme(resolvedTheme: string | undefined) {
  return resolvedTheme === DARK_THEME ? endatixThemeDark : endatixThemeLight;
}

/**
 * Maps `next-themes` `resolvedTheme` to Survey Model `applyTheme` payload.
 */
export function pickSurveyTheme(resolvedTheme: string | undefined) {
  return resolvedTheme === DARK_THEME
    ? endatixSurveyThemeDark
    : endatixSurveyThemeLight;
}

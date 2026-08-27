import type { ITheme, SurveyModel } from "survey-core";
import { DefaultDark, DefaultLight } from "survey-core/themes";
import { registerCreatorTheme } from "survey-creator-core";
import {
  endatixSurveyThemeLight,
  pickSurveyTheme,
  type HubTheme,
} from "./endatix-themes";

let isRegistered = false;

/**
 * Registers the Default light/dark **Creator chrome** themes (v3 ships
 * default-light only). Do not call `registerSurveyTheme`: tenant themes reach
 * Theme Editor through `themeEditor.addTheme`, and registering the built-in
 * catalog fills the chooser with Contrast/Borderless/… instead.
 */
export function registerThemes(): void {
  if (isRegistered) {
    return;
  }

  registerCreatorTheme(DefaultLight, DefaultDark);
  isRegistered = true;
}

/**
 * SurveyJS `ThemeModel.getObjectDiffs` calls `Object.keys` on nested objects, and
 * `typeof null === "object"` — so a stored theme with `cssVariables: null` or
 * `header: null` throws during Theme Editor diffs and on HMR.
 */
export function sanitizeSurveyTheme<T extends object>(theme: T): T {
  const next = { ...theme } as T & { cssVariables?: unknown; header?: unknown };

  if (
    next.cssVariables == null ||
    typeof next.cssVariables !== "object" ||
    Array.isArray(next.cssVariables)
  ) {
    next.cssVariables = {};
  }

  if (next.header == null || typeof next.header !== "object") {
    delete next.header;
  }

  return next;
}

/**
 * Applies a form's stored theme (the GetActive `themeModel` JSON), layered on
 * DefaultLight so v3 `--sjs2-*` and legacy `--sjs-*` both resolve. Falls back to
 * the Endatix survey theme when the form has no assigned theme.
 */
export function applyFormSurveyTheme(
  model: SurveyModel,
  storedTheme?: ITheme,
): void {
  if (storedTheme) {
    model.applyTheme(storedTheme, DefaultLight);
    return;
  }

  model.applyTheme(endatixSurveyThemeLight);
}

type DashboardThemeTarget = {
  applyTheme: (theme: ITheme, baseTheme?: ITheme) => void;
};

const SURVEY_BASE_THEME_STYLE_ATTR = "data-survey-base-theme-variables";
const SURVEY_BASE_THEME_STYLE_ID = "endatix-sjs-base-theme-variables";

/**
 * SurveyJS `ensureBaseThemeStyles` inserts a `<style>` as a child of the
 * survey root (inside the App Router tree). Relocating it to `document.head`
 * avoids HMR/`_rsc` on some surfaces, but **dashboard must not use this**:
 * in-page Hub theme toggle then leaves `--sjs2-*` incomplete until remount.
 * Keep the tag under the dashboard container and call `applyTheme` in place.
 */
export function relocateSurveyBaseThemeStyles(from: ParentNode): void {
  const injected = from.querySelector(`style[${SURVEY_BASE_THEME_STYLE_ATTR}]`);
  if (!injected) {
    return;
  }

  const existing = document.getElementById(SURVEY_BASE_THEME_STYLE_ID);
  if (existing) {
    if (existing.textContent !== injected.textContent) {
      existing.textContent = injected.textContent;
    }
    injected.remove();
    return;
  }

  injected.id = SURVEY_BASE_THEME_STYLE_ID;
  document.head.appendChild(injected);
}

/**
 * Applies the Hub survey palette to a SurveyJS Dashboard **after** `render()`.
 *
 * `applyTheme` before render skips `applyThemeToElement` (`renderResult` is null),
 * so Chart.js caches the light base tick colour. Call this after `render()` and
 * on Hub palette change. Do not drive it from ResizeObserver or sidebar width:
 * applyTheme injects `<style>` and rebuilds content.
 */
export function applyHubDashboardTheme(
  dashboard: DashboardThemeTarget,
  resolvedTheme: string | undefined,
  root?: HTMLElement | null,
): void {
  const theme: HubTheme = pickSurveyTheme(resolvedTheme);
  const base = theme.colorPalette === "dark" ? DefaultDark : DefaultLight;
  dashboard.applyTheme(
    { ...theme, cssVariables: { ...theme.cssVariables } },
    base,
  );
  if (root) {
    relocateSurveyBaseThemeStyles(root);
  }
}

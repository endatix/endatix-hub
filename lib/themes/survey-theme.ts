import type { ITheme, SurveyModel } from "survey-core";
import { DefaultDark, DefaultLight } from "survey-core/themes";
import { registerCreatorTheme } from "survey-creator-core";
import { pickSurveyTheme, type HubTheme } from "./endatix-themes";

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

const PANEL_BACKGROUND_TOKEN = "--sjs2-color-component-panel-default-bg";

/**
 * Restores the panelless surface that a legacy theme's own panel colour undoes.
 *
 * survey-core 3.x `patchLegacyCSSVariables` sets this token to `transparent` for an
 * `isPanelless` theme, then maps legacy `--sjs-questionpanel-backcolor` over the top —
 * so a stored theme carrying both renders framed panels despite the flag. Naming the
 * v3 token in the theme keeps the conversion from filling it in.
 *
 * Pinning this one derived token is the narrow fix: `--sjs-questionpanel-backcolor`
 * also feeds several action-surface tokens, so dropping it from the legacy set would
 * change more than the panels. Stored tenant theme JSON stays untouched (DESIGN.md §9).
 */
export function withPanellessSurface(theme: ITheme): ITheme {
  if (!theme.isPanelless) {
    return theme;
  }

  return {
    ...theme,
    cssVariables: {
      ...theme.cssVariables,
      [PANEL_BACKGROUND_TOKEN]: "transparent",
    },
  };
}

/**
 * Applies a form's stored theme (the GetActive `themeModel` JSON), layered on
 * DefaultLight so v3 `--sjs2-*` and legacy `--sjs-*` both resolve.
 *
 * No assigned theme → SurveyJS DefaultLight (green), same as Creator Preview.
 * Hub survey tokens stay on analytics (`applyHubDashboardTheme`) and Hub-internal
 * survey models (`useEndatixSurveyTheme`) — not on public share/embed.
 */
export function applyFormSurveyTheme(
  model: SurveyModel,
  storedTheme?: ITheme,
): void {
  if (storedTheme) {
    model.applyTheme(withPanellessSurface(storedTheme), DefaultLight);
    return;
  }

  model.applyTheme(DefaultLight);
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

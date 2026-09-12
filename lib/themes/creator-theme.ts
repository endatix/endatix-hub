import type { SurveyModel } from "survey-core";
import type { SurveyCreator } from "survey-creator-react";
import type { HubTheme } from "./endatix-themes";

const TRANSLATION_TAB_NAME = "translation";

type TranslationTabSurveys = {
  stringsSurvey?: SurveyModel;
  stringsHeaderSurvey?: SurveyModel;
};

type TranslationTabPlugin = {
  model?: TranslationTabSurveys;
};

const DARK_PALETTE = "dark";

/**
 * Values SurveyJS must read as real colors, not as `var()` references.
 *
 * `--sjs2-*` sources and relative-color functions are left alone: the browser
 * treats an unknown var as an inherited `color`, which previously repainted the
 * dark chrome with the Hub foreground.
 */
const SURVEYJS_RELATIVE_TOKEN =
  /var\(--sjs2-|lch\(from |rgba\(from |rgb\(from |hsl\(from |hwb\(from /i;

/**
 * Inherited by the probe, so "not a color" is distinguishable from a color.
 * Never compare against this literal — read it back computed, because the engine
 * picks the serialization (CSS Color 4 permits `rgb(1 2 3)`).
 */
const NOT_A_COLOR = "rgb(1, 2, 3)";

/**
 * Resolves Hub CSS values (`var(--content-canvas)`, …) to computed colors.
 *
 * Creator does its brand-tint maths in JS (`parseColor`), which cannot read a
 * `var()` reference — without this pass the property grid's selected rows and
 * the top-bar toggle lose their brand tint.
 *
 * Only values that really are colors may be rewritten. A `var()` holding a
 * length — `--sjs2-base-unit-radius: var(--radius, 0.5rem)` — is *valid at parse
 * time* and dropped at computed-value time, and the browser then reports the
 * **inherited** color. Rewriting the radius base unit to a color made every
 * `calc(var(--sjs2-base-unit-radius) * n)` invalid, which flattened Creator to
 * `border-radius: 0` — property grid inputs, popups and dialogs (endatix-hub#954).
 * Hence the sentinel on the probe's parent: an invalid value computes to the
 * inherited sentinel, a real color computes to itself.
 */
function resolveHubColors(theme: HubTheme, root?: HTMLElement): HubTheme {
  if (typeof document === "undefined" || !theme?.cssVariables) {
    return theme;
  }

  const mountRoot = root ?? document.body;
  if (!mountRoot) {
    return theme;
  }

  const probeHost = document.createElement("div");
  probeHost.style.cssText =
    "visibility:hidden;position:absolute;width:0;height:0;pointer-events:none;overflow:hidden;" +
    `color:${NOT_A_COLOR};`;
  const probe = document.createElement("div");
  probeHost.appendChild(probe);
  mountRoot.appendChild(probeHost);

  const resolved: Record<string, string> = {};

  try {
    // Read the sentinel back instead of trusting the literal: a dropped value is
    // reported in whatever serialization this engine uses for an inherited color.
    const notAColor = getComputedStyle(probeHost).color || NOT_A_COLOR;

    for (const [key, value] of Object.entries(theme.cssVariables)) {
      if (SURVEYJS_RELATIVE_TOKEN.test(value)) {
        continue;
      }

      probe.style.color = ""; // a rejected value leaves the previous one in place
      probe.style.color = value;
      if (probe.style.color === "") {
        continue; // the browser rejected it outright — not a color
      }

      const computed = getComputedStyle(probe).color;
      if (computed && computed !== notAColor && !computed.includes("var(")) {
        resolved[key] = computed;
      }
    }
  } finally {
    probeHost.remove();
  }

  return { ...theme, cssVariables: { ...theme.cssVariables, ...resolved } };
}

/** Applies the Endatix chrome to a Creator instance. */
export function applyEndatixCreatorTheme(
  creator: SurveyCreator,
  theme: HubTheme,
  root?: HTMLElement,
): void {
  const resolved = resolveHubColors(theme, root);
  creator.preferredColorPalette =
    resolved.colorPalette === DARK_PALETTE ? "dark" : "light";
  // `applyCreatorTheme` already calls `syncTheme` and refreshes the designer plugin.
  creator.applyCreatorTheme(resolved);
  // Do not call `stringsSurvey.applyTheme`: v3 rebuilds the nested Form Library
  // theme (style tags + themeChanged). On the Translations tab that retriggers
  // Next.js HMR/`_rsc` refresh in dev. Paint tokens onto the existing root instead.
  paintTranslationSurveyRoots(creator, resolved.cssVariables);
}

function paintTranslationSurveyRoots(
  creator: SurveyCreator,
  cssVariables: Record<string, string> | undefined,
): void {
  const plugin = creator.getPlugin?.(TRANSLATION_TAB_NAME) as
    | TranslationTabPlugin
    | undefined;
  const model = plugin?.model;
  if (!model || !cssVariables) {
    return;
  }

  paintCssVariables(model.stringsSurvey?.rootElement, cssVariables);
  paintCssVariables(model.stringsHeaderSurvey?.rootElement, cssVariables);
}

function paintCssVariables(
  root: HTMLElement | undefined,
  cssVariables: Record<string, string>,
): void {
  if (!root) {
    return;
  }

  for (const [name, value] of Object.entries(cssVariables)) {
    if (name.startsWith("--")) {
      root.style.setProperty(name, value);
    }
  }
}

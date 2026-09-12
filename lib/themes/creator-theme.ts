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

/** Sentinel the probe inherits. Compare it computed — the engine picks the serialization. */
const NOT_A_COLOR = "rgb(1, 2, 3)";

/**
 * Resolves Hub CSS values to computed colors, which Creator's JS brand-tint
 * maths (`parseColor`) needs — it cannot read a `var()`.
 *
 * Only real colors may be rewritten: `color: var(--radius, 0.5rem)` parses, is
 * dropped at computed-value time, then reported as the *inherited* color. That
 * turned a length into a color and flattened every `calc()` radius in Creator to
 * 0 (endatix-hub#954), hence the sentinel on the probe's parent.
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
    // Read it back: the engine picks the serialization.
    const notAColor = getComputedStyle(probeHost).color || NOT_A_COLOR;

    for (const [key, value] of Object.entries(theme.cssVariables)) {
      if (SURVEYJS_RELATIVE_TOKEN.test(value)) {
        continue;
      }

      probe.style.color = ""; // a rejected value would leave the previous one
      probe.style.color = value;
      if (probe.style.color === "") {
        continue; // rejected at parse — not a color
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

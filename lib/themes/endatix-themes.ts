import { DefaultDark, DefaultLight } from "survey-core/themes";

/**
 * The Endatix themes: Hub design tokens expressed as SurveyJS v3 **source**
 * `--sjs2-*` tokens. Override sources only — downstream brand/bg/fg ramps derive
 * from them via relative color.
 *
 * @see https://surveyjs.io/stay-updated/blog/surveyjs-v3-theme-adapters
 */

export type HubTheme = {
  themeName: string;
  colorPalette: string;
  isLight?: boolean;
  isPanelless?: boolean;
  cssVariables: Record<string, string>;
};

/**
 * Literal fallback for every Hub token these themes reference.
 *
 * Public form pages (`/share`, `/embed`) deliberately do not load
 * `app/globals.css` — respondents should not be served the Hub's whole Tailwind
 * bundle. Without a fallback, `var(--primary)` there is undefined, which makes
 * the whole `--sjs2-*` declaration invalid at computed-value time: surfaces
 * render transparent and the submit button loses its background.
 *
 * Values mirror `:root` in `app/globals.css`; `__tests__/endatix-themes.test.ts`
 * parses that file and fails if the two drift apart.
 */
export const hubTokenFallbacks: Record<string, string> = {
  "--background": "hsl(0 0% 100%)",
  "--foreground": "hsl(222.2 84% 4.9%)",
  "--card": "hsl(0 0% 100%)",
  "--primary": "hsl(216 100% 41%)",
  "--primary-foreground": "hsl(210 40% 98%)",
  "--muted-foreground": "hsl(215.4 16.3% 46.9%)",
  "--border": "hsl(214.3 31.8% 91.4%)",
  "--ring": "hsl(216 100% 41%)",
  "--radius": "0.5rem",
  "--destructive": "hsl(0 84.2% 60.2%)",
  "--success": "hsl(152 55% 36%)",
  "--warning": "hsl(32 90% 46%)",
  "--info": "hsl(216 100% 41%)",
};

/** `var(--token, <literal>)` — follows the Hub palette when globals.css is loaded. */
export function hubToken(
  name: keyof typeof hubTokenFallbacks & string,
): string {
  return `var(${name}, ${hubTokenFallbacks[name]})`;
}

/** Brand and state tokens, shared by the Creator chrome and the survey themes. */
const brandTokens: Record<string, string> = {
  "--sjs2-color-project-brand-600": hubToken("--primary"),
  "--sjs2-color-fg-brand-on-primary": hubToken("--primary-foreground"),
  "--sjs2-color-fg-basic-primary": hubToken("--foreground"),
  "--sjs2-color-fg-basic-secondary": hubToken("--muted-foreground"),
  "--sjs2-color-fg-brand-primary": hubToken("--primary"),
  "--sjs2-color-border-basic-secondary": hubToken("--border"),
  "--sjs2-base-unit-radius": hubToken("--radius"),
  "--sjs2-color-utility-a11y": hubToken("--ring"),
  "--sjs2-palette-red-600": hubToken("--destructive"),
  "--sjs2-palette-green-600": hubToken("--success"),
  "--sjs2-palette-yellow-600": hubToken("--warning"),
  "--sjs2-palette-blue-600": hubToken("--info"),
};

/**
 * Creator chrome. Only the editing surfaces take the Hub page canvas tint; the
 * panels around them stay on the card surface, or the whole Creator flattens
 * into one colour. Each token is annotated with the region it paints (verified
 * against survey-creator-core 3.0.2 CSS) — `hub/DESIGN.md` §8 has the table.
 *
 * Three depths, the same rule in both palettes:
 *
 *   input fill  `--background`       #fff / #000f21     most recessed
 *   canvas      `--content-canvas`   #eff4fe / #001225  the working area
 *   raised      `--card`             #fff / #001a34     chrome panels, question cards
 *
 * The base theme leaves the raised and recessed surfaces on SurveyJS's own **neutral**
 * grey ramp. That is invisible in light (near-white either way) but shows up as warm
 * grey (#1c1b20 / #222126) against the Hub navy in dark, so both are mapped below.
 * Keep them distinct from the canvas: mapping every surface to `--content-canvas` is
 * what flattened the whole Creator into one colour.
 */
const creatorTokens: Record<string, string> = {
  ...brandTokens,

  // Chrome — white in light, the raised panel colour in dark.
  "--sjs2-color-utility-tabs": hubToken("--card"), // .svc-top-bar
  "--sjs2-color-utility-toolbox": hubToken("--card"), // .svc-toolbox__panel
  "--sjs2-color-utility-property-grid": hubToken("--card"), // .svc-side-bar__container
  "--sjs2-color-utility-body": hubToken("--card"), // .svc-creator root
  "--sjs2-color-utility-sheet": hubToken("--card"), // popup / preset sheets

  // Raised inside the canvas and the panels: question cards, sidebar tabs, the
  // collapsed icon rail, surface buttons.
  "--sjs2-color-bg-basic-primary": hubToken("--card"),
  // Recessed inside a panel: input fills, search boxes, unchecked controls.
  "--sjs2-color-bg-basic-secondary": hubToken("--background"),

  // Editing surfaces — the Hub page canvas. Creator-only, so no fallback needed.
  "--sjs2-color-utility-surface-designer": "var(--content-canvas)", // .svc-tab-designer
  "--sjs2-color-utility-surface-survey": "var(--content-canvas)", // .sd-root-modern::before
  "--sjs2-color-utility-surface-json-editor": "var(--content-canvas)",
  "--sjs2-color-utility-surface-presets-manager": "var(--content-canvas)",
  "--sjs2-color-utility-surface-translations": "var(--content-canvas)", // .svc-translation-tab
};

/** Form Library surfaces for Hub-rendered and unassigned public surveys. */
const surveyTokens: Record<string, string> = {
  ...brandTokens,
  "--sjs2-color-utility-body": hubToken("--background"),
  "--sjs2-color-utility-sheet": hubToken("--card"),
  "--sjs2-color-utility-surface-survey": hubToken("--background"),
  "--sjs2-color-bg-basic-primary": hubToken("--card"),
  "--sjs2-color-bg-basic-secondary": hubToken("--background"),
  // Chart.js samples these at render; they do not follow Hub `--foreground`
  // unless set explicitly (base theme keeps SurveyJS light grey).
  "--sjs2-color-data-grid-fg-label": hubToken("--foreground"),
  // Dashboard dropdowns (`.sa-dropdown-header-text`) use these; survey-analytics
  // CSS fallbacks are light-theme `#1c1b20`.
  "--sjs2-color-component-input-default-value": hubToken("--foreground"),
  "--sjs2-color-component-input-default-placeholder":
    hubToken("--muted-foreground"),
  "--sjs2-color-fg-basic-primary-muted": hubToken("--muted-foreground"),
  // `.sa-toolbar__button--disabled` (Reset Filter idle). Base colour is light-grey
  // and opacity 0.25, so the label vanishes on both palettes.
  "--sjs2-color-component-action-neutral-tertiary-disabled-label":
    hubToken("--muted-foreground"),
  "--sjs2-opacity-disabled": "1",
};

export const endatixThemeLight: HubTheme = {
  ...DefaultLight,
  themeName: "default",
  colorPalette: "light",
  isLight: true,
  cssVariables: { ...DefaultLight.cssVariables, ...creatorTokens },
};

export const endatixThemeDark: HubTheme = {
  ...DefaultDark,
  themeName: "default",
  colorPalette: "dark",
  isLight: false,
  cssVariables: { ...DefaultDark.cssVariables, ...creatorTokens },
};

export const endatixSurveyThemeLight: HubTheme = {
  ...DefaultLight,
  isPanelless: false,
  themeName: "endatix-survey-light",
  colorPalette: "light",
  cssVariables: { ...DefaultLight.cssVariables, ...surveyTokens },
};

export const endatixSurveyThemeDark: HubTheme = {
  ...DefaultDark,
  isPanelless: false,
  themeName: "endatix-survey-dark",
  colorPalette: "dark",
  cssVariables: { ...DefaultDark.cssVariables, ...surveyTokens },
};

const DARK = "dark";

/** Maps `next-themes` `resolvedTheme` to Creator chrome; light until resolved. */
export function pickCreatorTheme(resolvedTheme: string | undefined): HubTheme {
  return resolvedTheme === DARK ? endatixThemeDark : endatixThemeLight;
}

/** Maps `next-themes` `resolvedTheme` to a `Model.applyTheme` payload. */
export function pickSurveyTheme(resolvedTheme: string | undefined): HubTheme {
  return resolvedTheme === DARK
    ? endatixSurveyThemeDark
    : endatixSurveyThemeLight;
}

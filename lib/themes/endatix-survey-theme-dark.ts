import { endatixSurveyThemeLight } from "./endatix-survey-theme-light";

const darkCssVariables = {
  ...endatixSurveyThemeLight.cssVariables,
  "--sjs-general-backcolor": "var(--background)",
  "--sjs-general-backcolor-dark": "var(--surface-container-low)",
  "--sjs-general-backcolor-dim": "var(--muted)",
  "--sjs-general-backcolor-dim-light": "var(--card)",
  "--sjs-general-backcolor-dim-dark": "var(--surface-container-high)",
  "--sjs-general-forecolor": "var(--foreground)",
  "--sjs-general-forecolor-light": "var(--muted-foreground)",
  "--sjs-general-dim-forecolor": "var(--foreground)",
  "--sjs-general-dim-forecolor-light": "var(--muted-foreground)",
  "--sjs-primary-backcolor": "var(--primary)",
  "--sjs-primary-backcolor-light":
    "color-mix(in srgb, var(--primary) 12%, var(--background))",
  "--sjs-primary-backcolor-dark": "var(--primary-dim)",
  "--sjs-secondary-backcolor": "var(--secondary)",
  "--sjs-secondary-backcolor-light":
    "color-mix(in srgb, var(--secondary-foreground) 8%, var(--background))",
  "--sjs-shadow-small":
    "0px 1px 2px 0px color-mix(in srgb, var(--foreground) 20%, transparent)",
  "--sjs-shadow-medium":
    "0px 2px 6px 0px color-mix(in srgb, var(--foreground) 25%, transparent)",
  "--sjs-shadow-large":
    "0px 8px 16px 0px color-mix(in srgb, var(--foreground) 30%, transparent)",
  "--sjs-shadow-inner":
    "inset 0px 0px 0px 1px color-mix(in srgb, var(--foreground) 20%, transparent)",
  "--sjs-border-light": "var(--border)",
  "--sjs-border-default":
    "color-mix(in srgb, var(--foreground) 30%, var(--border))",
  "--sjs-border-inside":
    "color-mix(in srgb, var(--foreground) 35%, transparent)",
  "--sjs-special-red": "var(--destructive)",
  "--sjs-special-red-light":
    "color-mix(in srgb, var(--destructive) 20%, var(--background))",
  "--sjs-special-green": "var(--success)",
  "--sjs-special-green-light":
    "color-mix(in srgb, var(--success) 20%, var(--background))",
  "--sjs-special-blue": "var(--chart-3)",
  "--sjs-special-blue-light":
    "color-mix(in srgb, var(--chart-3) 20%, var(--background))",
  "--sjs-special-yellow": "var(--warning)",
  "--sjs-special-yellow-light":
    "color-mix(in srgb, var(--warning) 20%, var(--background))",
};

export const endatixSurveyThemeDark = {
  cssVariables: darkCssVariables,
  isPanelless: false,
  themeName: "endatix-survey-dark",
  colorPalette: "dark",
};

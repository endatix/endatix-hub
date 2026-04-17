const surveyFontVariables = {
  "--sjs-article-font-xx-large-textDecoration": "none",
  "--sjs-article-font-xx-large-fontWeight": "600",
  "--sjs-article-font-xx-large-fontStyle": "normal",
  "--sjs-article-font-xx-large-fontStretch": "normal",
  "--sjs-article-font-xx-large-letterSpacing": "0",
  "--sjs-article-font-xx-large-lineHeight": "64px",
  "--sjs-article-font-xx-large-paragraphIndent": "0px",
  "--sjs-article-font-xx-large-textCase": "none",
  "--sjs-article-font-x-large-textDecoration": "none",
  "--sjs-article-font-x-large-fontWeight": "600",
  "--sjs-article-font-x-large-fontStyle": "normal",
  "--sjs-article-font-x-large-fontStretch": "normal",
  "--sjs-article-font-x-large-letterSpacing": "0",
  "--sjs-article-font-x-large-lineHeight": "56px",
  "--sjs-article-font-x-large-paragraphIndent": "0px",
  "--sjs-article-font-x-large-textCase": "none",
  "--sjs-article-font-large-textDecoration": "none",
  "--sjs-article-font-large-fontWeight": "600",
  "--sjs-article-font-large-fontStyle": "normal",
  "--sjs-article-font-large-fontStretch": "normal",
  "--sjs-article-font-large-letterSpacing": "0",
  "--sjs-article-font-large-lineHeight": "40px",
  "--sjs-article-font-large-paragraphIndent": "0px",
  "--sjs-article-font-large-textCase": "none",
  "--sjs-article-font-medium-textDecoration": "none",
  "--sjs-article-font-medium-fontWeight": "600",
  "--sjs-article-font-medium-fontStyle": "normal",
  "--sjs-article-font-medium-fontStretch": "normal",
  "--sjs-article-font-medium-letterSpacing": "0",
  "--sjs-article-font-medium-lineHeight": "32px",
  "--sjs-article-font-medium-paragraphIndent": "0px",
  "--sjs-article-font-medium-textCase": "none",
  "--sjs-article-font-default-textDecoration": "none",
  "--sjs-article-font-default-fontWeight": "400",
  "--sjs-article-font-default-fontStyle": "normal",
  "--sjs-article-font-default-fontStretch": "normal",
  "--sjs-article-font-default-letterSpacing": "0",
  "--sjs-article-font-default-lineHeight": "28px",
  "--sjs-article-font-default-paragraphIndent": "0px",
  "--sjs-article-font-default-textCase": "none",
};

const sharedSurveyCssVariables = {
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
  "--sjs-primary-forecolor": "var(--primary-foreground)",
  "--sjs-primary-forecolor-light":
    "color-mix(in srgb, var(--primary-foreground) 25%, transparent)",
  "--sjs-base-unit": "8px",
  "--sjs-corner-radius": "var(--radius)",
  "--sjs-secondary-backcolor": "var(--secondary)",
  "--sjs-secondary-backcolor-light":
    "color-mix(in srgb, var(--secondary-foreground) 8%, var(--background))",
  "--sjs-secondary-backcolor-semi-light":
    "color-mix(in srgb, var(--secondary-foreground) 16%, var(--background))",
  "--sjs-secondary-forecolor": "var(--secondary-foreground)",
  "--sjs-secondary-forecolor-light":
    "color-mix(in srgb, var(--secondary-foreground) 25%, transparent)",
  "--sjs-border-light": "var(--border)",
  "--sjs-special-red": "var(--destructive)",
  "--sjs-special-red-light":
    "color-mix(in srgb, var(--destructive) 12%, var(--background))",
  "--sjs-special-red-forecolor": "var(--destructive-foreground)",
  "--sjs-special-green": "var(--success)",
  "--sjs-special-green-light":
    "color-mix(in srgb, var(--success) 14%, var(--background))",
  "--sjs-special-green-forecolor": "var(--success-foreground)",
  "--sjs-special-blue": "var(--chart-3)",
  "--sjs-special-blue-light":
    "color-mix(in srgb, var(--chart-3) 14%, var(--background))",
  "--sjs-special-blue-forecolor": "var(--primary-foreground)",
  "--sjs-special-yellow": "var(--warning)",
  "--sjs-special-yellow-light":
    "color-mix(in srgb, var(--warning) 14%, var(--background))",
  "--sjs-special-yellow-forecolor": "var(--warning-foreground)",
};

const lightOnlyCssVariables = {
  "--sjs-border-default":
    "color-mix(in srgb, var(--foreground) 12%, var(--border))",
  "--sjs-border-inside":
    "color-mix(in srgb, var(--foreground) 14%, transparent)",
  "--sjs-shadow-small":
    "0px 1px 2px 0px color-mix(in srgb, var(--foreground) 6%, transparent)",
  "--sjs-shadow-small-reset":
    "0px 0px 0px 0px color-mix(in srgb, var(--foreground) 12%, transparent)",
  "--sjs-shadow-medium":
    "0px 2px 6px 0px color-mix(in srgb, var(--foreground) 8%, transparent)",
  "--sjs-shadow-large":
    "0px 8px 16px 0px color-mix(in srgb, var(--foreground) 10%, transparent)",
  "--sjs-shadow-inner":
    "inset 0px 0px 0px 1px color-mix(in srgb, var(--foreground) 8%, transparent)",
  "--sjs-shadow-inner-reset": "inset 0px 0px 0px 0px transparent",
};

const darkOnlyCssVariables = {
  "--sjs-border-default":
    "color-mix(in srgb, var(--foreground) 30%, var(--border))",
  "--sjs-border-inside":
    "color-mix(in srgb, var(--foreground) 35%, transparent)",
  "--sjs-shadow-small":
    "0px 1px 2px 0px color-mix(in srgb, var(--foreground) 20%, transparent)",
  "--sjs-shadow-small-reset":
    "0px 0px 0px 0px color-mix(in srgb, var(--foreground) 30%, transparent)",
  "--sjs-shadow-medium":
    "0px 2px 6px 0px color-mix(in srgb, var(--foreground) 25%, transparent)",
  "--sjs-shadow-large":
    "0px 8px 16px 0px color-mix(in srgb, var(--foreground) 30%, transparent)",
  "--sjs-shadow-inner":
    "inset 0px 0px 0px 1px color-mix(in srgb, var(--foreground) 20%, transparent)",
  "--sjs-shadow-inner-reset": "inset 0px 0px 0px 0px transparent",
  "--sjs-special-red-light":
    "color-mix(in srgb, var(--destructive) 20%, var(--background))",
  "--sjs-special-green-light":
    "color-mix(in srgb, var(--success) 20%, var(--background))",
  "--sjs-special-blue-light":
    "color-mix(in srgb, var(--chart-3) 20%, var(--background))",
  "--sjs-special-yellow-light":
    "color-mix(in srgb, var(--warning) 20%, var(--background))",
};

export const endatixSurveyThemeLight = {
  cssVariables: {
    ...sharedSurveyCssVariables,
    ...lightOnlyCssVariables,
    ...surveyFontVariables,
  },
  isPanelless: false,
  themeName: "endatix-survey-light",
  colorPalette: "light",
};

export const endatixSurveyThemeDark = {
  cssVariables: {
    ...sharedSurveyCssVariables,
    ...darkOnlyCssVariables,
  },
  isPanelless: false,
  themeName: "endatix-survey-dark",
  colorPalette: "dark",
};

const sharedCssVariables = {
  "--sjs-layer-1-background-500": "var(--surface-container-lowest)",
  "--sjs-layer-1-background-400": "var(--surface-container-low)",
  "--sjs-layer-1-foreground-100": "var(--foreground)",
  "--sjs-layer-1-foreground-75":
    "color-mix(in srgb, var(--foreground) 75%, transparent)",
  "--sjs-layer-1-foreground-50":
    "color-mix(in srgb, var(--foreground) 65%, transparent)",
  "--sjs-layer-2-background-500": "var(--surface-container)",
  "--sjs-layer-2-background-400": "var(--surface-container-high)",
  "--sjs-layer-2-foreground-100": "var(--foreground)",
  "--sjs-layer-2-foreground-75":
    "color-mix(in srgb, var(--foreground) 75%, transparent)",
  "--sjs-layer-2-foreground-50":
    "color-mix(in srgb, var(--foreground) 65%, transparent)",
  "--sjs-layer-3-background-500": "var(--surface-container-high)",
  "--sjs-layer-3-background-400": "var(--surface-container)",
  "--sjs-layer-3-foreground-100": "var(--foreground)",
  "--sjs-layer-3-foreground-75":
    "color-mix(in srgb, var(--foreground) 75%, transparent)",
  "--sjs-layer-3-foreground-50":
    "color-mix(in srgb, var(--foreground) 65%, transparent)",
  "--sjs-border-25": "var(--border)",
  "--sjs-border-10": "color-mix(in srgb, var(--border) 60%, transparent)",
  "--sjs-border-25-overlay":
    "color-mix(in srgb, var(--foreground) 25%, transparent)",
  "--sjs-primary-background-500": "var(--primary)",
  "--sjs-primary-background-400": "var(--primary-dim)",
  "--sjs-primary-background-10":
    "color-mix(in srgb, var(--primary) 10%, transparent)",
  "--sjs-primary-foreground-100": "var(--primary-foreground)",
  "--sjs-primary-foreground-25":
    "color-mix(in srgb, var(--primary-foreground) 25%, transparent)",
  "--sjs-secondary-background-500": "var(--primary)",
  "--sjs-secondary-background-400": "var(--primary-dim)",
  "--sjs-secondary-background-25":
    "color-mix(in srgb, var(--primary) 25%, transparent)",
  "--sjs-secondary-background-10":
    "color-mix(in srgb, var(--primary) 10%, transparent)",
  "--sjs-secondary-foreground-100": "var(--primary-foreground)",
  "--sjs-secondary-forecolor-25":
    "color-mix(in srgb, var(--primary-foreground) 25%, transparent)",
  "--sjs-semantic-red-background-500": "var(--destructive)",
  "--sjs-semantic-red-background-10":
    "color-mix(in srgb, var(--destructive) 12%, transparent)",
  "--sjs-semantic-red-foreground-100": "var(--destructive-foreground)",
  "--sjs-semantic-green-background-500": "var(--success)",
  "--sjs-semantic-green-background-10":
    "color-mix(in srgb, var(--success) 12%, transparent)",
  "--sjs-semantic-green-foreground-100": "var(--success-foreground)",
  "--sjs-semantic-blue-background-500": "var(--chart-3)",
  "--sjs-semantic-blue-background-10":
    "color-mix(in srgb, var(--chart-3) 12%, transparent)",
  "--sjs-semantic-blue-foreground-100": "var(--primary-foreground)",
  "--sjs-semantic-yellow-background-500": "var(--warning)",
  "--sjs-semantic-yellow-background-10":
    "color-mix(in srgb, var(--warning) 12%, transparent)",
  "--sjs-semantic-yellow-foreground-100": "var(--warning-foreground)",
  "--sjs-semantic-white-background-500": "var(--surface-container-lowest)",
  "--sjs-code-gray-700":
    "color-mix(in srgb, var(--foreground) 60%, var(--background))",
  "--sjs-code-blue-500": "var(--primary)",
  "--sjs-code-gray-300": "var(--foreground)",
  "--sjs-code-green-500": "var(--success)",
  "--sjs-code-red-500": "var(--destructive)",
  "--sjs-code-purple-500": "var(--chart-3)",
  "--sjs-code-yellow-500": "var(--warning)",
  "--sjs-code-gray-500":
    "color-mix(in srgb, var(--foreground) 45%, var(--background))",
  "--sjs-special-background": "var(--background)",
  "--sjs-special-haze": "color-mix(in srgb, var(--primary) 22%, transparent)",
  "--sjs-special-glow": "color-mix(in srgb, var(--primary) 10%, transparent)",
  "--sjs-special-shadow":
    "color-mix(in srgb, var(--foreground) 25%, transparent)",
};

export const endatixThemeLight = {
  themeName: "endatixThemeLight",
  colorPalette: "light",
  cssVariables: sharedCssVariables,
};

export const endatixThemeDark = {
  themeName: "endatixThemeDark",
  colorPalette: "dark",
  cssVariables: sharedCssVariables,
};

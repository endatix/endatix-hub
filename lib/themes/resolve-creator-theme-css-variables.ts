export type CreatorThemeCssPayload = {
  cssVariables?: Record<string, string>;
  [key: string]: unknown;
};

/**
 * Resolves CSS color-like values (var, color-mix, etc.) into concrete
 * computed color strings before applying SurveyJS Creator themes.
 */
export function resolveCreatorThemeCssVariables<T extends CreatorThemeCssPayload>(
  theme: T,
  root?: HTMLElement,
): T {
  if (typeof document === "undefined" || !theme?.cssVariables) {
    return theme;
  }

  const mountRoot = root ?? document.body;
  if (!mountRoot) {
    return theme;
  }

  const probe = document.createElement("div");
  probe.style.cssText =
    "visibility:hidden;position:absolute;width:0;height:0;pointer-events:none;overflow:hidden;";
  mountRoot.appendChild(probe);

  const resolvedVariables: Record<string, string> = {};

  try {
    for (const [key, originalValue] of Object.entries(theme.cssVariables)) {
      const sentinelColor = "rgb(1, 2, 3)";
      probe.style.color = sentinelColor;
      probe.style.color = originalValue;

      const inlineColor = probe.style.color;
      const browserRejected = inlineColor === "" || inlineColor === sentinelColor;

      if (browserRejected) {
        continue;
      }

      const computedColor = getComputedStyle(probe).color;
      if (!computedColor || computedColor === sentinelColor) {
        continue;
      }

      if (computedColor.includes("var(")) {
        continue;
      }

      resolvedVariables[key] = computedColor;
    }
  } finally {
    probe.remove();
  }

  return {
    ...theme,
    cssVariables: resolvedVariables,
  };
}

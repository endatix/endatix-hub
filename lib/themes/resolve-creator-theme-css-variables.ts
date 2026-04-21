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
  probe.style.cssText = "display:none;position:absolute;";
  mountRoot.appendChild(probe);

  const resolvedVariables: Record<string, string> = {};

  try {
    for (const [key, originalValue] of Object.entries(theme.cssVariables)) {
      probe.style.color = "";
      probe.style.color = originalValue;

      const browserAccepted = probe.style.color !== "";
      const resolvedColor = browserAccepted
        ? getComputedStyle(probe).color
        : originalValue;

      resolvedVariables[key] = resolvedColor || originalValue;
    }
  } finally {
    probe.remove();
  }

  return {
    ...theme,
    cssVariables: resolvedVariables,
  };
}

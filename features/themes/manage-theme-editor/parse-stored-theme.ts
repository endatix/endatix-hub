import type { Theme } from "@/lib/endatix-api/themes/types";
import { StoredTheme } from "@/features/themes/types";
import { sanitizeSurveyTheme } from "@/lib/themes/survey-theme";

export const DEFAULT_THEME_NAME = "default";

export function parseStoredTheme(theme: Theme): StoredTheme | null {
  try {
    const parsed: unknown = JSON.parse(theme.jsonData);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const storedTheme = parsed as StoredTheme;
    return sanitizeSurveyTheme({
      ...storedTheme,
      name: theme.name,
      id: theme.id,
      themeName: theme.name || storedTheme.themeName,
    });
  } catch (error) {
    console.error("Skipped invalid theme JSON", theme.id, error);
    return null;
  }
}

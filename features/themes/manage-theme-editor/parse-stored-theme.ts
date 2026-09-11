import type { Theme } from "@/lib/endatix-api/themes/types";
import { StoredTheme } from "@/features/themes/types";
import { sanitizeSurveyTheme } from "@/lib/themes/survey-theme";

export const DEFAULT_THEME_NAME = "default";

export function parseStoredTheme(theme: Theme): StoredTheme | null {
  try {
    const parsed = JSON.parse(theme.jsonData) as StoredTheme;
    return sanitizeSurveyTheme({
      ...parsed,
      name: theme.name,
      id: theme.id,
      themeName: theme.name || parsed.themeName,
    });
  } catch (error) {
    console.error("Skipped invalid theme JSON", theme.id, error);
    return null;
  }
}

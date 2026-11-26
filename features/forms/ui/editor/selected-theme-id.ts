import { DEFAULT_THEME_ID } from "@/features/themes/manage-theme-editor";
import type { ITheme } from "survey-core";

export function selectedThemeId(theme: (ITheme & { id?: string }) | undefined, fallback = DEFAULT_THEME_ID) {
  return theme?.themeName?.toLowerCase() === "default"
    ? DEFAULT_THEME_ID
    : (theme?.id ?? fallback);
}

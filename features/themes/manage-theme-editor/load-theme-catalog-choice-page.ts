import { listThemesPageAction } from "@/features/themes/list-themes";
import { StoredTheme } from "@/features/themes/types";
import { Result } from "@/lib/result";
import { mapSkipTakeToPage } from "@/lib/survey-features/infrastructure/choices-lazy-load-page";
import { DEFAULT_THEME_NAME, parseStoredTheme } from "./parse-stored-theme";

export type ThemeCatalogChoice = { value: string; text: string };

export type ThemeCatalogChoicePage = {
  items: ThemeCatalogChoice[];
  hasNextPage: boolean;
};

export const DEFAULT_THEME_CHOICE: ThemeCatalogChoice = {
  value: DEFAULT_THEME_NAME,
  text: "Default",
};

/**
 * One page of Theme Editor `themeName` choices: `Default` first, then the
 * tenant catalog. Themes with unusable JSON are dropped, so the caller counts
 * the items it received rather than the server's `totalRecords`.
 */
export async function loadThemeCatalogChoicePage(
  skip: number,
  take: number,
  registerThemes: (themes: StoredTheme[]) => void,
): Promise<ThemeCatalogChoicePage> {
  const { page, pageSize } = mapSkipTakeToPage(skip, take);
  const result = await listThemesPageAction({ page, pageSize });
  if (result === undefined || Result.isError(result)) {
    return {
      items: skip === 0 ? [DEFAULT_THEME_CHOICE] : [],
      hasNextPage: false,
    };
  }

  const stored: StoredTheme[] = [];
  const items: ThemeCatalogChoice[] = skip === 0 ? [DEFAULT_THEME_CHOICE] : [];

  for (const theme of result.value.items) {
    const parsed = parseStoredTheme(theme);
    if (!parsed?.themeName) {
      continue;
    }
    stored.push(parsed);
    items.push({ value: parsed.themeName, text: parsed.themeName });
  }

  registerThemes(stored);

  return { items, hasNextPage: result.value.hasNextPage };
}

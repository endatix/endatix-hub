import { listThemesPageAction } from "@/features/themes/list-themes";
import { StoredTheme } from "@/features/themes/types";
import { Result } from "@/lib/result";
import {
  mapSkipTakeToPage,
  mapSurveyJsLazyLoadTotal,
} from "@/lib/survey-features/infrastructure/choices-lazy-load-page";
import { DEFAULT_THEME_NAME, parseStoredTheme } from "./parse-stored-theme";

export type ThemeCatalogChoice = { value: string; text: string };

const DEFAULT_CHOICE: ThemeCatalogChoice = {
  value: DEFAULT_THEME_NAME,
  text: "Default",
};

export async function loadThemeCatalogChoicePage(
  skip: number,
  take: number,
  filter: string | undefined,
  registerThemes: (themes: StoredTheme[]) => void,
): Promise<{ items: ThemeCatalogChoice[]; total: number }> {
  const { page, pageSize } = mapSkipTakeToPage(skip, take);
  const result = await listThemesPageAction({ page, pageSize });
  if (result === undefined || Result.isError(result)) {
    return { items: skip === 0 ? [DEFAULT_CHOICE] : [], total: 1 };
  }

  const stored: StoredTheme[] = [];
  const items: ThemeCatalogChoice[] = [];
  const needle = filter?.trim().toLowerCase();

  for (const theme of result.value.items) {
    const parsed = parseStoredTheme(theme);
    if (!parsed?.themeName) {
      continue;
    }
    if (needle && !parsed.themeName.toLowerCase().includes(needle)) {
      continue;
    }
    stored.push(parsed);
    items.push({ value: parsed.themeName, text: parsed.themeName });
  }

  registerThemes(stored);

  if (skip === 0) {
    const defaultMatches = !needle || DEFAULT_THEME_NAME.includes(needle);
    if (defaultMatches) {
      items.unshift(DEFAULT_CHOICE);
    }
  }

  return {
    items,
    total: mapSurveyJsLazyLoadTotal({
      skip,
      take,
      itemCount: items.length,
      totalRecords: result.value.totalRecords + (skip === 0 ? 1 : 0),
      hasNextPage: result.value.hasNextPage,
    }),
  };
}

import type { Question } from "survey-core";
import {
  DEFAULT_CATALOG_LOCALE,
  fromSurveyModelLocale,
  isDefaultCatalogLocale,
  toCatalogLocales,
} from "@/lib/localization";

export type SurveyLocaleSource = {
  locale?: string;
  getUsedLocales?: () => string[];
};

export type ResolvedSurveyLocalesForDataList = {
  /**
   * Active catalog locale for API projection.
   * `undefined` means use labels.default (survey default language).
   */
  locale?: string;
  /** Catalog locales to request so locale switches need no refetch. */
  includeLocales: string[];
};

/**
 * Resolves the active catalog locale and includeLocales for data-list APIs
 * from SurveyJS model/question locale state.
 */
export function resolveSurveyLocalesForDataList(
  model: SurveyLocaleSource,
  question: Pick<Question, "getLocale">,
): ResolvedSurveyLocalesForDataList {
  const rawLocale = (question.getLocale() || model.locale || "").trim();
  const catalogLocale = fromSurveyModelLocale(rawLocale);
  const locale = isDefaultCatalogLocale(catalogLocale)
    ? undefined
    : catalogLocale;

  const usedLocales =
    typeof model.getUsedLocales === "function" ? model.getUsedLocales() : [];

  const includeLocales = uniqueLocales([
    DEFAULT_CATALOG_LOCALE,
    ...toCatalogLocales(usedLocales),
    ...(locale ? [locale] : []),
  ]);

  return { locale, includeLocales };
}

function uniqueLocales(locales: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const locale of locales) {
    const trimmed = locale.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const key =
      trimmed === DEFAULT_CATALOG_LOCALE
        ? DEFAULT_CATALOG_LOCALE
        : trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(key);
  }
  return result;
}

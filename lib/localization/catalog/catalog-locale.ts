import { surveyLocalization } from "survey-core";

/** Catalog / LocalizableString key for the survey default language. */
export const DEFAULT_CATALOG_LOCALE = "default";

/**
 * SurveyJS runtime code that {@link SurveyModel.getUsedLocales} substitutes for
 * JSON <c>default</c> (usually <c>en</c>).
 */
export function surveyJsDefaultLocaleCode(): string {
  return surveyLocalization.defaultLocale || "en";
}

/** True when the code means the survey / data-list default language. */
export function isDefaultCatalogLocale(
  code: string | undefined | null,
): boolean {
  if (code == null) {
    return true;
  }

  const trimmed = code.trim();
  if (trimmed.length === 0 || trimmed === DEFAULT_CATALOG_LOCALE) {
    return true;
  }

  return trimmed.toLowerCase() === surveyJsDefaultLocaleCode().toLowerCase();
}

/**
 * Maps an owned catalog locale to SurveyJS <c>model.locale</c>.
 * Default language is the empty string.
 */
export function toSurveyModelLocale(catalogLocale: string): string {
  return isDefaultCatalogLocale(catalogLocale)
    ? ""
    : catalogLocale.trim().toLowerCase();
}

/**
 * Maps SurveyJS <c>model.locale</c> (or a getUsedLocales entry) to an owned
 * catalog locale code.
 */
export function fromSurveyModelLocale(
  modelLocale: string | undefined | null,
): string {
  if (isDefaultCatalogLocale(modelLocale)) {
    return DEFAULT_CATALOG_LOCALE;
  }

  return String(modelLocale).trim().toLowerCase();
}

/**
 * Normalizes SurveyJS <c>getUsedLocales()</c> (which rewrites JSON
 * <c>default</c> → defaultLocale code) into catalog codes for UI / APIs.
 */
export function toCatalogLocales(usedLocales: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const locale of usedLocales) {
    const catalog = fromSurveyModelLocale(locale);
    if (seen.has(catalog)) {
      continue;
    }
    seen.add(catalog);
    result.push(catalog);
  }

  return result;
}

/**
 * Display label for a catalog locale (uses SurveyJS localeNames for the
 * runtime defaultLocale code when the catalog key is <c>default</c>).
 */
export function catalogLocaleDisplayName(catalogLocale: string): string {
  if (isDefaultCatalogLocale(catalogLocale)) {
    const code = surveyJsDefaultLocaleCode();
    return surveyLocalization.localeNames[code] || code;
  }

  const code = catalogLocale.trim().toLowerCase();
  return surveyLocalization.localeNames[code] || code;
}

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
 * Default language is the survey's own <c>locale</c> from its JSON
 * (<paramref name="surveyDefaultLocale"/>), or the empty string when it has none.
 */
export function toSurveyModelLocale(
  catalogLocale: string,
  surveyDefaultLocale = "",
): string {
  const locale = isDefaultCatalogLocale(catalogLocale)
    ? surveyDefaultLocale
    : catalogLocale;
  return isDefaultCatalogLocale(locale) ? "" : locale.trim().toLowerCase();
}

/**
 * Maps SurveyJS <c>model.locale</c> (or a getUsedLocales entry) to an owned
 * catalog locale code. The survey's own <c>locale</c> from its JSON
 * (<paramref name="surveyDefaultLocale"/>) maps to the default.
 */
export function fromSurveyModelLocale(
  modelLocale: string | undefined | null,
  surveyDefaultLocale = "",
): string {
  const locale = toSurveyModelLocale(modelLocale ?? "");
  if (locale === "" || locale === toSurveyModelLocale(surveyDefaultLocale)) {
    return DEFAULT_CATALOG_LOCALE;
  }

  return locale;
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

const englishLanguageNames = new Intl.DisplayNames(["en"], {
  type: "language",
});

function runtimeCode(catalogLocale: string): string {
  return isDefaultCatalogLocale(catalogLocale)
    ? surveyJsDefaultLocaleCode()
    : catalogLocale.trim().replaceAll("_", "-");
}

/** Native name for respondents (`Español`), from SurveyJS locale packs. */
export function catalogLocaleDisplayName(catalogLocale: string): string {
  const code = runtimeCode(catalogLocale).toLowerCase();
  return surveyLocalization.localeNames[code] || code;
}

/** English name for Hub staff (`Spanish`), falling back to the code. */
export function catalogLocaleEnglishName(catalogLocale: string): string {
  const code = runtimeCode(catalogLocale);
  try {
    return englishLanguageNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Canonical short code shown next to a language name (`en`, `pt-BR`). */
export function catalogLocaleCodeLabel(catalogLocale: string): string {
  const code = runtimeCode(catalogLocale);
  try {
    return Intl.getCanonicalLocales(code)[0] ?? code;
  } catch {
    return code;
  }
}

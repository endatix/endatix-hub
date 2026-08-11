import { DEFAULT_CATALOG_LOCALE } from "./catalog-locale";

/** Matches Endatix.Core TranslationCultureNormalizer (lowercase BCP-47-shaped). */
const CULTURE_CODE_PATTERN = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/;

/**
 * Lowercases/trims a culture tag. Returns `undefined` when nullish or blank.
 */
export function normalizeOptionalCultureTag(
  code: string | undefined | null,
): string | undefined {
  const trimmed = code?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.toLowerCase();
}

export function isValidCultureCode(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.toLowerCase() === DEFAULT_CATALOG_LOCALE) {
    return true;
  }

  return CULTURE_CODE_PATTERN.test(trimmed.toLowerCase());
}

export function normalizeCultureCode(code: string): string {
  const trimmed = code.trim();
  if (trimmed.toLowerCase() === DEFAULT_CATALOG_LOCALE) {
    return DEFAULT_CATALOG_LOCALE;
  }

  const normalized = trimmed.toLowerCase();
  if (!CULTURE_CODE_PATTERN.test(normalized)) {
    throw new Error(`'${code}' is not a valid culture code.`);
  }

  return normalized;
}

/**
 * True when `key` is the catalog default label (`default`) or equals the
 * configured default culture (e.g. data-list `defaultLocale: "en"` → `en`
 * maps to `labels.default`).
 *
 * Distinct from {@link isDefaultCatalogLocale}, which also treats SurveyJS's
 * runtime defaultLocale code as default regardless of catalog config.
 */
export function isCatalogDefaultLocaleKey(
  key: string,
  defaultLocale?: string | null,
): boolean {
  if (key === DEFAULT_CATALOG_LOCALE) {
    return true;
  }

  const defaultCulture = normalizeOptionalCultureTag(defaultLocale);
  return defaultCulture != null && key === defaultCulture;
}

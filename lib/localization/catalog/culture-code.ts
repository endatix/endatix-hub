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
 * Returns the normalized culture code, or `null` when the input is invalid.
 */
export function tryNormalizeCultureCode(code: string): string | null {
  if (!isValidCultureCode(code)) {
    return null;
  }

  return normalizeCultureCode(code);
}

export type NormalizeCultureCodesResult =
  | { ok: true; value: string[] }
  | { ok: false; invalid: string };

/**
 * Normalizes every culture code in `codes`. Fails on the first invalid entry
 * (returns `{ ok: false, invalid }`); does not silently drop invalids.
 */
export function normalizeCultureCodes(
  codes: readonly string[],
): NormalizeCultureCodesResult {
  const value: string[] = [];
  for (const code of codes) {
    const normalized = tryNormalizeCultureCode(code);
    if (normalized === null) {
      return { ok: false, invalid: code.trim() || code };
    }
    value.push(normalized);
  }

  return { ok: true, value };
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

/**
 * Reads the catalog-default label text from a labels map.
 * Prefers `labels.default`, then a culture key that aliases to the configured
 * default locale (e.g. `labels.en` when `defaultLocale` is `en`).
 * Returns `null` when no default label entry is present.
 */
export function resolveCatalogDefaultLabelText(
  labels: Record<string, unknown> | undefined | null,
  defaultLocale?: string | null,
): string | null {
  if (!labels) {
    return null;
  }

  const direct = labels[DEFAULT_CATALOG_LOCALE];
  if (typeof direct === "string") {
    return direct.trim();
  }

  for (const [rawKey, text] of Object.entries(labels)) {
    if (typeof text !== "string") {
      continue;
    }

    let normalized: string;
    try {
      normalized = normalizeCultureCode(rawKey);
    } catch {
      continue;
    }

    if (isCatalogDefaultLocaleKey(normalized, defaultLocale)) {
      return text.trim();
    }
  }

  return null;
}

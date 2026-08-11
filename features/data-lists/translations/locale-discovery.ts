import "survey-core/i18n";
import { surveyLocalization } from "survey-core";
import {
  DEFAULT_CATALOG_LOCALE,
  isCatalogDefaultLocaleKey,
  isValidCultureCode,
  normalizeCultureCode,
  normalizeOptionalCultureTag,
} from "@/lib/localization";

export {
  isValidCultureCode,
  normalizeCultureCode,
  normalizeOptionalCultureTag,
  isCatalogDefaultLocaleKey,
} from "@/lib/localization";

export const DATA_LIST_MAX_ITEMS = 5_000;
export const DATA_LIST_MAX_LOCALES = 20;
export const DATA_LIST_MAX_LABEL_LENGTH = 100;
export const DATA_LIST_MAX_CSV_CHARS = 2_000_000;
export const DATA_LIST_MAX_JSON_FILE_BYTES = 5 * 1024 * 1024;

export type LocaleDiscoveryOptions = {
  availableLocales: string[];
  defaultLocale?: string;
};

export type LocaleColumnKind = "default" | "existing" | "new" | "invalid";

export type LocaleColumnDiscovery = {
  /** Raw header / labels key as found in the file. */
  raw: string;
  /** Normalized key (`default` or lowercase culture). Empty when invalid. */
  key: string;
  kind: LocaleColumnKind;
};

export type LocaleImportDiscovery = {
  columns: LocaleColumnDiscovery[];
  /** Locales already in the catalog (or mapped to default). */
  existingLocales: string[];
  /** Valid new cultures the user may choose to add. */
  newLocales: string[];
  /** Columns / keys that cannot be imported. */
  invalidLocales: string[];
  rowCount: number;
  /** True when the payload is structurally usable aside from locale selection. */
  canProceed: boolean;
  structuralErrors: string[];
};

export type LocaleImportSelection = {
  /** Cultures to add to AvailableLocales before import. */
  ensureLocales: string[];
  /** Locale keys to keep in the payload (`default` + selected cultures). */
  includedLocales: string[];
};

/**
 * Friendly label for UI via SurveyJS `surveyLocalization`.
 * Validation/normalize stay API-aligned; this is display-only.
 */
export function formatLocaleLabel(key: string): string {
  if (key === DEFAULT_CATALOG_LOCALE) {
    return "default";
  }

  const name = resolveSurveyLocaleDisplayName(key);
  return name ? `${key} · ${name}` : key;
}

function resolveSurveyLocaleDisplayName(key: string): string | undefined {
  const direct = surveyLocalization.getLocaleName(key, true);
  if (direct && direct.toLowerCase() !== key.toLowerCase()) {
    return direct;
  }

  const lower = key.toLowerCase();
  const englishNames = surveyLocalization.localeNamesInEnglish as
    | Record<string, string>
    | undefined;

  for (const [code, name] of Object.entries(englishNames ?? {})) {
    if (code.toLowerCase() === lower && name.trim().length > 0) {
      return name;
    }
  }

  for (const code of Object.keys(surveyLocalization.localeNames ?? {})) {
    if (code.toLowerCase() !== lower) {
      continue;
    }

    const name = surveyLocalization.getLocaleName(code, true);
    if (name && name.toLowerCase() !== lower) {
      return name;
    }
  }

  return undefined;
}

function isCatalogLocale(
  key: string,
  options: LocaleDiscoveryOptions,
): boolean {
  if (isCatalogDefaultLocaleKey(key, options.defaultLocale)) {
    return true;
  }

  const available = new Set(
    options.availableLocales
      .map((locale) => normalizeOptionalCultureTag(locale))
      .filter((locale): locale is string => locale != null),
  );

  return available.has(key);
}

export function discoverLocalesFromKeys(
  keys: string[],
  options: LocaleDiscoveryOptions,
  rowCount: number,
  structuralErrors: string[] = [],
): LocaleImportDiscovery {
  const columns: LocaleColumnDiscovery[] = [];
  const existing = new Set<string>();
  const discoveredNew = new Set<string>();
  const invalid: string[] = [];

  for (const raw of keys) {
    const trimmed = raw.trim();
    if (!trimmed) {
      columns.push({ raw, key: "", kind: "invalid" });
      invalid.push(raw);
      continue;
    }

    if (!isValidCultureCode(trimmed)) {
      columns.push({ raw: trimmed, key: "", kind: "invalid" });
      invalid.push(trimmed);
      continue;
    }

    let normalized: string;
    try {
      normalized = normalizeCultureCode(trimmed);
    } catch {
      columns.push({ raw: trimmed, key: "", kind: "invalid" });
      invalid.push(trimmed);
      continue;
    }

    if (isCatalogDefaultLocaleKey(normalized, options.defaultLocale)) {
      columns.push({
        raw: trimmed,
        key: DEFAULT_CATALOG_LOCALE,
        kind: "default",
      });
      existing.add(DEFAULT_CATALOG_LOCALE);
      continue;
    }

    if (isCatalogLocale(normalized, options)) {
      columns.push({ raw: trimmed, key: normalized, kind: "existing" });
      existing.add(normalized);
      continue;
    }

    columns.push({ raw: trimmed, key: normalized, kind: "new" });
    discoveredNew.add(normalized);
  }

  const structuralOk = structuralErrors.length === 0;
  return {
    columns,
    existingLocales: [...existing],
    newLocales: [...discoveredNew].sort((a, b) => a.localeCompare(b)),
    invalidLocales: invalid,
    rowCount,
    canProceed: structuralOk && invalid.length === 0,
    structuralErrors,
  };
}

export function buildDefaultLocaleSelection(
  discovery: LocaleImportDiscovery,
): Record<string, boolean> {
  const selected: Record<string, boolean> = {};
  for (const column of discovery.columns) {
    if (!column.key || column.kind === "invalid") {
      continue;
    }
    selected[column.key] = true;
  }
  return selected;
}

export function resolveLocaleImportSelection(
  discovery: LocaleImportDiscovery,
  selected: Record<string, boolean>,
  catalogLocaleCount: number,
): { selection: LocaleImportSelection; errors: string[] } {
  const errors: string[] = [];
  const included = new Set<string>();

  for (const column of discovery.columns) {
    if (!column.key || column.kind === "invalid") {
      continue;
    }

    if (column.kind === "default") {
      included.add(DEFAULT_CATALOG_LOCALE);
      continue;
    }

    if (selected[column.key] !== false) {
      included.add(column.key);
    }
  }

  if (!included.has(DEFAULT_CATALOG_LOCALE)) {
    errors.push("The default locale column is required.");
  }

  const ensureLocales = discovery.newLocales.filter(
    (locale) => included.has(locale) && selected[locale] !== false,
  );

  const catalogAfterEnsure = catalogLocaleCount + ensureLocales.length;
  if (catalogAfterEnsure > DATA_LIST_MAX_LOCALES) {
    errors.push(
      `Selecting these locales would exceed the catalog limit of ${DATA_LIST_MAX_LOCALES}.`,
    );
  }

  if (discovery.rowCount > DATA_LIST_MAX_ITEMS) {
    errors.push(
      `A data list cannot have more than ${DATA_LIST_MAX_ITEMS.toLocaleString()} items.`,
    );
  }

  return {
    selection: {
      ensureLocales,
      includedLocales: [...included],
    },
    errors,
  };
}

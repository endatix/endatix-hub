import "survey-core/i18n";
import { surveyLocalization } from "survey-core";
import {
  DEFAULT_CATALOG_LOCALE,
  normalizeOptionalCultureTag,
  toCatalogLocaleKey,
  tryNormalizeCultureCode,
} from "@/lib/localization";
import {
  DATA_LIST_MAX_ITEMS,
  DATA_LIST_MAX_LOCALES,
} from "@/features/data-lists/import-limits";
import {
  IMPORT_LOCALES_CATALOG_LIMIT_ERROR,
  IMPORT_TOO_MANY_ITEMS_ERROR,
} from "@/features/data-lists/import-validation-messages";

export {
  isValidCultureCode,
  normalizeCultureCode,
  normalizeOptionalCultureTag,
  isCatalogDefaultLocaleKey,
  toCatalogLocaleKey,
  tryNormalizeCultureCode,
} from "@/lib/localization";

export {
  DATA_LIST_MAX_CSV_CHARS,
  DATA_LIST_MAX_ITEMS,
  DATA_LIST_MAX_JSON_FILE_BYTES,
  DATA_LIST_MAX_LABEL_LENGTH,
  DATA_LIST_MAX_LOCALES,
} from "@/features/data-lists/import-limits";

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

function buildAvailableLocaleSet(
  availableLocales: readonly string[],
): Set<string> {
  return new Set(
    availableLocales
      .map((locale) => normalizeOptionalCultureTag(locale))
      .filter((locale): locale is string => locale != null),
  );
}

/**
 * Classifies one raw locale key for import discovery (normalize, default-alias,
 * duplicate detection, catalog membership).
 */
function classifyLocaleColumn(
  raw: string,
  options: LocaleDiscoveryOptions,
  availableLocales: ReadonlySet<string>,
  seenCanonicalKeys: Set<string>,
): LocaleColumnDiscovery {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { raw, key: "", kind: "invalid" };
  }

  const normalized = tryNormalizeCultureCode(trimmed);
  if (normalized === null) {
    return { raw: trimmed, key: "", kind: "invalid" };
  }

  const key = toCatalogLocaleKey(normalized, options.defaultLocale);
  if (seenCanonicalKeys.has(key)) {
    return { raw: trimmed, key: "", kind: "invalid" };
  }
  seenCanonicalKeys.add(key);

  if (key === DEFAULT_CATALOG_LOCALE) {
    return { raw: trimmed, key: DEFAULT_CATALOG_LOCALE, kind: "default" };
  }

  if (availableLocales.has(key)) {
    return { raw: trimmed, key, kind: "existing" };
  }

  return { raw: trimmed, key, kind: "new" };
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
  const seenCanonicalKeys = new Set<string>();
  const availableLocales = buildAvailableLocaleSet(options.availableLocales);

  for (const raw of keys) {
    const column = classifyLocaleColumn(
      raw,
      options,
      availableLocales,
      seenCanonicalKeys,
    );
    columns.push(column);

    if (column.kind === "invalid") {
      invalid.push(column.raw);
      continue;
    }

    if (column.kind === "default" || column.kind === "existing") {
      existing.add(column.key);
      continue;
    }

    discoveredNew.add(column.key);
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
    errors.push(IMPORT_LOCALES_CATALOG_LIMIT_ERROR);
  }

  if (discovery.rowCount > DATA_LIST_MAX_ITEMS) {
    errors.push(IMPORT_TOO_MANY_ITEMS_ERROR);
  }

  return {
    selection: {
      ensureLocales,
      includedLocales: [...included],
    },
    errors,
  };
}

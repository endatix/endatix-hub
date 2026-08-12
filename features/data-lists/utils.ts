import { DataListChoiceItem } from "@/lib/endatix-api";
import {
  DEFAULT_CATALOG_LOCALE,
  isValidCultureCode,
  normalizeCultureCode,
  normalizeOptionalCultureTag,
  resolveCatalogDefaultLabelText,
  toCatalogLocaleKey,
  tryNormalizeCultureCode,
} from "@/lib/localization";
import { DATA_LIST_ITEM_MAX_LENGTH } from "@/lib/survey-features/data-lists/constants";
import {
  discoverLocalesFromKeys,
  DATA_LIST_MAX_CSV_CHARS,
  DATA_LIST_MAX_ITEMS,
  DATA_LIST_MAX_JSON_FILE_BYTES,
  type LocaleDiscoveryOptions,
  type LocaleImportDiscovery,
} from "./translations/locale-discovery";
import { JsonErrorAnnotation, ParsedValidation } from "./types";
import {
  IMPORT_AT_LEAST_ONE_ITEM_ERROR as AT_LEAST_ONE_ERROR,
  IMPORT_TOO_MANY_ITEMS_ERROR as TOO_MANY_ITEMS_ERROR,
} from "./import-validation-messages";

export { AT_LEAST_ONE_ERROR, TOO_MANY_ITEMS_ERROR };

export { DATA_LIST_MAX_JSON_FILE_BYTES as MAX_FILE_SIZE_BYTES } from "./translations/locale-discovery";
export { DATA_LIST_MAX_CSV_CHARS } from "./translations/locale-discovery";
export const MAX_PREVIEW_ERRORS = 20;

export const FILE_SIZE_ERROR = `File is too large. Max file size is ${
  DATA_LIST_MAX_JSON_FILE_BYTES / (1024 * 1024)
}MB.`;
export const CSV_FILE_SIZE_ERROR = `File is too large. Max CSV size is ${DATA_LIST_MAX_CSV_CHARS.toLocaleString()} characters.`;
export const READ_ERROR = "Failed to read the selected file.";
export const JSON_REQUIRED_ERROR = "JSON content is required.";
export const INVALID_JSON_ERROR = "Invalid JSON format.";
export const ARRAY_REQUIRED_ERROR = "JSON root must be an array of objects.";

const createErrorResponse = (error: string, row = 0): ParsedValidation => ({
  validItems: [],
  errors: [error],
  annotations: [{ row, column: 0, text: error, type: "error" }],
});

const createAnnotation = (text: string, row: number): JsonErrorAnnotation => ({
  row,
  column: 0,
  text,
  type: "error",
});

const findItemLineNumber = (
  text: string,
  item: unknown,
  itemIndex: number,
  startPos = 0,
): number => {
  const itemJson = JSON.stringify(item);
  const pos = text.indexOf(itemJson, startPos);
  if (pos === -1) return itemIndex + 1;

  return text.slice(0, pos).split("\n").length;
};

type ParsedChoice = {
  value: string;
  label?: string;
  labels?: Record<string, string>;
};

function resolveDefaultLabel(
  item: ParsedChoice,
  defaultLocale?: string,
): string {
  const fromLabels = resolveCatalogDefaultLabelText(item.labels, defaultLocale);
  if (fromLabels !== null) {
    return fromLabels;
  }

  return typeof item.label === "string" ? item.label.trim() : "";
}

function parseTrimmedLabels(
  labels: unknown,
): Record<string, string> | undefined {
  if (!labels || typeof labels !== "object") {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(labels as Record<string, unknown>)
      .filter(([, text]) => typeof text === "string")
      .map(([key, text]) => [key, (text as string).trim()]),
  );
}

function collectChoiceFieldErrors(
  itemNumber: number,
  valueField: string,
  defaultLabel: string,
  labels: Record<string, string> | undefined,
): string[] {
  const prefix = `Choice item ${itemNumber}`;
  const errors: string[] = [];

  if (!valueField) {
    errors.push(`${prefix}: value is required.`);
  } else if (valueField.length > DATA_LIST_ITEM_MAX_LENGTH) {
    errors.push(
      `${prefix}: value exceeds ${DATA_LIST_ITEM_MAX_LENGTH} characters.`,
    );
  }

  if (!defaultLabel) {
    errors.push(`${prefix}: label is required (or labels.default).`);
  } else if (defaultLabel.length > DATA_LIST_ITEM_MAX_LENGTH) {
    errors.push(
      `${prefix}: label exceeds ${DATA_LIST_ITEM_MAX_LENGTH} characters.`,
    );
  }

  if (!labels) {
    return errors;
  }

  for (const [key, text] of Object.entries(labels)) {
    if (!isValidCultureCode(key)) {
      errors.push(`${prefix}: locale '${key}' is not a valid culture code.`);
    }
    if (text.length > DATA_LIST_ITEM_MAX_LENGTH) {
      errors.push(
        `${prefix}: labels.${key} exceeds ${DATA_LIST_ITEM_MAX_LENGTH} characters.`,
      );
    }
  }

  return errors;
}

function trackUniqueValue(
  valueField: string,
  seenValues: Set<string>,
  itemNumber: number,
): string | undefined {
  if (!valueField) {
    return undefined;
  }

  if (seenValues.has(valueField)) {
    return `Choice item ${itemNumber}: value must be unique.`;
  }

  seenValues.add(valueField);
  return undefined;
}

function toNormalizedChoiceItem(
  valueField: string,
  defaultLabel: string,
  labels: Record<string, string> | undefined,
  defaultLocale?: string,
): DataListChoiceItem {
  const merged: Record<string, string> = {};
  if (labels) {
    for (const [rawKey, text] of Object.entries(labels)) {
      const key = toCatalogLocaleKey(
        normalizeCultureCode(rawKey),
        defaultLocale,
      );
      merged[key] = text;
    }
  }
  if (!merged[DEFAULT_CATALOG_LOCALE]) {
    merged[DEFAULT_CATALOG_LOCALE] = defaultLabel;
  }
  return { value: valueField, labels: merged };
}

function validateChoiceItem(
  item: unknown,
  index: number,
  seenValues: Set<string>,
  defaultLocale?: string,
): { errors: string[]; item?: DataListChoiceItem } {
  const itemNumber = index + 1;

  if (item === null) {
    return { errors: [`Choice item ${itemNumber}: item cannot be null.`] };
  }

  if (typeof item !== "object") {
    return { errors: [`Choice item ${itemNumber}: item must be an object.`] };
  }

  const itemObj = item as ParsedChoice;
  const valueField =
    typeof itemObj.value === "string" ? itemObj.value.trim() : "";
  const defaultLabel = resolveDefaultLabel(itemObj, defaultLocale);
  const labels = parseTrimmedLabels(itemObj.labels);

  const errors = collectChoiceFieldErrors(
    itemNumber,
    valueField,
    defaultLabel,
    labels,
  );

  const uniqueError = trackUniqueValue(valueField, seenValues, itemNumber);
  if (uniqueError) {
    errors.push(uniqueError);
  }

  if (valueField && defaultLabel && errors.length === 0) {
    return {
      errors,
      item: toNormalizedChoiceItem(
        valueField,
        defaultLabel,
        labels,
        defaultLocale,
      ),
    };
  }

  return { errors };
}

export type ValidateJsonInputOptions = {
  defaultLocale?: string;
};

/**
 * Validates a JSON string containing data list items.
 * Accepts `{ label, value }` or `{ value, labels: { default, … } }` and normalizes to `{ value, labels }`.
 */
export function validateJsonInput(
  value: string,
  options: ValidateJsonInputOptions = {},
): ParsedValidation {
  const trimmed = value.trim();

  if (!trimmed) {
    return createErrorResponse(JSON_REQUIRED_ERROR);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return createErrorResponse(INVALID_JSON_ERROR);
  }

  if (!Array.isArray(parsed)) {
    return createErrorResponse(ARRAY_REQUIRED_ERROR);
  }

  if (parsed.length === 0) {
    return createErrorResponse(AT_LEAST_ONE_ERROR);
  }

  if (parsed.length > DATA_LIST_MAX_ITEMS) {
    return createErrorResponse(TOO_MANY_ITEMS_ERROR);
  }

  const errors: string[] = [];
  const annotations: JsonErrorAnnotation[] = [];
  const validItems: DataListChoiceItem[] = [];
  const seenValues = new Set<string>();

  parsed.forEach((item, index) => {
    const row = findItemLineNumber(value, item, index);
    const result = validateChoiceItem(
      item,
      index,
      seenValues,
      options.defaultLocale,
    );

    for (const err of result.errors) {
      errors.push(err);
      annotations.push(createAnnotation(err, row));
    }

    if (result.item) {
      validItems.push(result.item);
    }
  });

  return { validItems, errors, annotations };
}

export function discoverLocalesFromJsonItems(
  items: DataListChoiceItem[],
  options: LocaleDiscoveryOptions,
): LocaleImportDiscovery {
  const keys = new Set<string>([DEFAULT_CATALOG_LOCALE]);
  for (const item of items) {
    if (item.labels) {
      for (const key of Object.keys(item.labels)) {
        keys.add(key);
      }
    }
  }

  return discoverLocalesFromKeys([...keys], options, items.length);
}

/**
 * Serialize list items for client-side JSON download (template shape).
 */
export function serializeDataListItemsJson(
  items: DataListChoiceItem[],
): string {
  const payload = items.map((item) => ({
    value: item.value,
    labels: item.labels,
  }));

  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Keeps `default` plus selected locale keys on each item. Drops deselected labels.
 */
export function filterJsonItemsByLocales(
  items: DataListChoiceItem[],
  includedLocales: string[],
  defaultLocale?: string,
): DataListChoiceItem[] {
  const included = new Set(
    includedLocales.map((locale) => locale.trim().toLowerCase()),
  );
  included.add(DEFAULT_CATALOG_LOCALE);

  const defaultCulture = normalizeOptionalCultureTag(defaultLocale);

  return items.map((item) => {
    const labels: Record<string, string> = {};
    for (const [rawKey, text] of Object.entries(item.labels)) {
      const key = tryNormalizeCultureCode(rawKey);
      if (key === null) {
        continue;
      }

      const catalogKey = toCatalogLocaleKey(key, defaultCulture);
      if (catalogKey === DEFAULT_CATALOG_LOCALE) {
        labels[DEFAULT_CATALOG_LOCALE] = text;
        continue;
      }

      if (included.has(key)) {
        labels[key] = text;
      }
    }

    return {
      value: item.value,
      labels,
    };
  });
}

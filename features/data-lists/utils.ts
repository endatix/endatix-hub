import { DataListChoiceItem } from "@/lib/endatix-api";
import { DATA_LIST_ITEM_MAX_LENGTH } from "@/lib/survey-features/data-lists/constants";
import {
  DATA_LIST_MAX_JSON_FILE_BYTES,
  DEFAULT_LABEL_KEY,
  discoverLocalesFromKeys,
  isValidCultureCode,
  normalizeCultureCode,
  type LocaleDiscoveryOptions,
  type LocaleImportDiscovery,
} from "./translations/locale-discovery";
import { JsonErrorAnnotation, ParsedValidation } from "./types";

export const MAX_FILE_SIZE_BYTES = DATA_LIST_MAX_JSON_FILE_BYTES;
export const MAX_PREVIEW_ERRORS = 20;

export const FILE_SIZE_ERROR = "File is too large. Max file size is 5MB.";
export const READ_ERROR = "Failed to read the selected file.";
export const JSON_REQUIRED_ERROR = "JSON content is required.";
export const INVALID_JSON_ERROR = "Invalid JSON format.";
export const ARRAY_REQUIRED_ERROR = "JSON root must be an array of objects.";
export const AT_LEAST_ONE_ERROR = "At least one item is required.";

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

function resolveDefaultLabel(item: ParsedChoice): string {
  if (item.labels && typeof item.labels[DEFAULT_LABEL_KEY] === "string") {
    return item.labels[DEFAULT_LABEL_KEY].trim();
  }

  return typeof item.label === "string" ? item.label.trim() : "";
}

/**
 * Validates a JSON string containing data list items.
 * Accepts `{ label, value }` or `{ value, labels: { default, … } }` and normalizes to `{ value, labels }`.
 */
export function validateJsonInput(value: string): ParsedValidation {
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

  const errors: string[] = [];
  const annotations: JsonErrorAnnotation[] = [];
  const validItems: DataListChoiceItem[] = [];
  const seenValues = new Set<string>();

  parsed.forEach((item, index) => {
    const row = findItemLineNumber(value, item, index);

    if (item === null) {
      const err = `Choice item ${index + 1}: item cannot be null.`;
      errors.push(err);
      annotations.push(createAnnotation(err, row));
      return;
    }

    if (typeof item !== "object") {
      const err = `Choice item ${index + 1}: item must be an object.`;
      errors.push(err);
      annotations.push(createAnnotation(err, row));
      return;
    }

    const itemObj = item as ParsedChoice;
    const valueField =
      typeof itemObj.value === "string" ? itemObj.value.trim() : "";
    const defaultLabel = resolveDefaultLabel(itemObj);
    const labels =
      itemObj.labels && typeof itemObj.labels === "object"
        ? Object.fromEntries(
            Object.entries(itemObj.labels)
              .filter(([, text]) => typeof text === "string")
              .map(([key, text]) => [key, (text as string).trim()]),
          )
        : undefined;

    if (!valueField) {
      const err = `Choice item ${index + 1}: value is required.`;
      errors.push(err);
      annotations.push(createAnnotation(err, row));
    } else if (valueField.length > DATA_LIST_ITEM_MAX_LENGTH) {
      const err = `Choice item ${index + 1}: value exceeds ${DATA_LIST_ITEM_MAX_LENGTH} characters.`;
      errors.push(err);
      annotations.push(createAnnotation(err, row));
    }

    if (!defaultLabel) {
      const err = `Choice item ${index + 1}: label is required (or labels.default).`;
      errors.push(err);
      annotations.push(createAnnotation(err, row));
    } else if (defaultLabel.length > DATA_LIST_ITEM_MAX_LENGTH) {
      const err = `Choice item ${index + 1}: label exceeds ${DATA_LIST_ITEM_MAX_LENGTH} characters.`;
      errors.push(err);
      annotations.push(createAnnotation(err, row));
    }

    if (labels) {
      for (const [key, text] of Object.entries(labels)) {
        if (
          !isValidCultureCode(key) &&
          key.toLowerCase() !== DEFAULT_LABEL_KEY
        ) {
          const err = `Choice item ${index + 1}: locale '${key}' is not a valid culture code.`;
          errors.push(err);
          annotations.push(createAnnotation(err, row));
        }
        if (text.length > DATA_LIST_ITEM_MAX_LENGTH) {
          const err = `Choice item ${index + 1}: labels.${key} exceeds ${DATA_LIST_ITEM_MAX_LENGTH} characters.`;
          errors.push(err);
          annotations.push(createAnnotation(err, row));
        }
      }
    }

    if (valueField) {
      if (seenValues.has(valueField)) {
        const err = `Choice item ${index + 1}: value must be unique.`;
        errors.push(err);
        annotations.push(createAnnotation(err, row));
      } else {
        seenValues.add(valueField);
      }
    }

    const itemErrors = errors.filter((e) =>
      e.includes(`Choice item ${index + 1}`),
    );
    if (valueField && defaultLabel && itemErrors.length === 0) {
      const merged: Record<string, string> = { ...(labels ?? {}) };
      if (!merged[DEFAULT_LABEL_KEY]) {
        merged[DEFAULT_LABEL_KEY] = defaultLabel;
      }
      validItems.push({ value: valueField, labels: merged });
    }
  });

  return { validItems, errors, annotations };
}

export function discoverLocalesFromJsonItems(
  items: DataListChoiceItem[],
  options: LocaleDiscoveryOptions,
): LocaleImportDiscovery {
  const keys = new Set<string>([DEFAULT_LABEL_KEY]);
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
  included.add(DEFAULT_LABEL_KEY);

  const defaultCulture = defaultLocale?.trim().toLowerCase();

  return items.map((item) => {
    const labels: Record<string, string> = {};
    for (const [rawKey, text] of Object.entries(item.labels)) {
      let key: string;
      try {
        key = normalizeCultureCode(rawKey);
      } catch {
        continue;
      }

      if (
        key === DEFAULT_LABEL_KEY ||
        (defaultCulture && key === defaultCulture)
      ) {
        labels[DEFAULT_LABEL_KEY] = text;
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

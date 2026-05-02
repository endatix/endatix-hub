import { DataListChoiceItem } from "@/lib/endatix-api";
import { JsonErrorAnnotation, ParsedValidation } from "./types";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_FIELD_LENGTH = 255;
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

/**
 * Validates a JSON string containing data list items.
 * @param value - The JSON string to validate.
 * @returns The validation result.
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

  const validationRules = [
    {
      check: (item: unknown) => !item || typeof item !== "object",
      getError: (_item: unknown, index: number) =>
        `Choice item ${index + 1}: item must be an object.`,
    },
    {
      check: (_item: unknown, label: string) => !label,
      getError: (_item: unknown, index: number) =>
        `Choice item ${index + 1}: label is required.`,
    },
    {
      check: (_item: unknown, _label: string, valueField: string) =>
        !valueField,
      getError: (_item: unknown, index: number) =>
        `Choice item ${index + 1}: value is required.`,
    },
    {
      check: (_item: unknown, _label: string, valueField: string) =>
        valueField.length > MAX_FIELD_LENGTH,
      getError: (_item: unknown, index: number) =>
        `Choice item ${index + 1}: value exceeds ${MAX_FIELD_LENGTH} characters.`,
    },
    {
      check: (_item: unknown, label: string) => label.length > MAX_FIELD_LENGTH,
      getError: (_item: unknown, index: number) =>
        `Choice item ${index + 1}: label exceeds ${MAX_FIELD_LENGTH} characters.`,
    },
  ];

  const uniqueValidation = {
    check: (_item: unknown, _label: string, valueField: string) =>
      !valueField ? false : seenValues.has(valueField),
    getError: (_item: unknown, index: number) =>
      `Choice item ${index + 1}: value must be unique.`,
  };

  parsed.forEach((item, index) => {
    const row = findItemLineNumber(trimmed, item, index);

    const itemObj = item as { label?: unknown; value?: unknown };
    const label = typeof itemObj.label === "string" ? itemObj.label.trim() : "";
    const valueField =
      typeof itemObj.value === "string" ? itemObj.value.trim() : "";

    const hasError = (errText: string) =>
      errors.some((e) => e.includes(errText));

    // Standard validation rules
    for (const rule of validationRules) {
      if (rule.check(item, label, valueField)) {
        const err = rule.getError(item, index);
        errors.push(err);
        annotations.push(createAnnotation(err, row));
      }
    }

    // Unique value check - must check BEFORE adding to seenValues
    if (valueField) {
      if (seenValues.has(valueField)) {
        const err = `Choice item ${index + 1}: value must be unique.`;
        errors.push(err);
        annotations.push(createAnnotation(err, row));
      } else {
        seenValues.add(valueField);
      }
    }

    // Add valid item if no errors for this item
    if (label && valueField && !hasError(`Choice item ${index + 1}`)) {
      validItems.push({ label, value: valueField });
    }
  });

  return { validItems, errors, annotations };
}

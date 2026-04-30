import type {
  DataListChoiceItem,
  DataListItem,
} from "@/lib/endatix-api/data-lists/types";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_FIELD_LENGTH = 255;
export const MAX_PREVIEW_ERRORS = 20;

export const FILE_SIZE_ERROR = "File is too large. Max file size is 5MB.";
export const READ_ERROR = "Failed to read the selected file.";
export const JSON_REQUIRED_ERROR = "JSON content is required.";
export const INVALID_JSON_ERROR = "Invalid JSON format.";
export const ARRAY_REQUIRED_ERROR = "JSON root must be an array of objects.";
export const AT_LEAST_ONE_ERROR = "At least one item is required.";

export interface ParsedValidation {
  validItems: DataListChoiceItem[];
  errors: string[];
}

export interface JsonFileHandlerState {
  jsonInput: string;
  validationError: string | null;
  selectedFileName: string | null;
}

export function parseAndValidateJson(value: string): ParsedValidation {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      validItems: [],
      errors: [JSON_REQUIRED_ERROR],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      validItems: [],
      errors: [INVALID_JSON_ERROR],
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      validItems: [],
      errors: [ARRAY_REQUIRED_ERROR],
    };
  }

  if (parsed.length === 0) {
    return {
      validItems: [],
      errors: [AT_LEAST_ONE_ERROR],
    };
  }

  const errors: string[] = [];
  const validItems: DataListChoiceItem[] = [];

  parsed.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`Row ${index + 1}: item must be an object.`);
      return;
    }

    const row = item as { label?: unknown; value?: unknown };
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const valueField = typeof row.value === "string" ? row.value.trim() : "";

    if (!label) {
      errors.push(`Row ${index + 1}: label is required.`);
    }

    if (!valueField) {
      errors.push(`Row ${index + 1}: value is required.`);
    }

    if (label.length > MAX_FIELD_LENGTH) {
      errors.push(
        `Row ${index + 1}: label exceeds ${MAX_FIELD_LENGTH} characters.`,
      );
    }

    if (valueField.length > MAX_FIELD_LENGTH) {
      errors.push(
        `Row ${index + 1}: value exceeds ${MAX_FIELD_LENGTH} characters.`,
      );
    }

    if (label && valueField) {
      validItems.push({
        label,
        value: valueField,
      });
    }
  });

  return { validItems, errors };
}

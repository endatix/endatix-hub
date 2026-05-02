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

export function parseAndValidateJson(value: string): ParsedValidation {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      validItems: [],
      errors: [JSON_REQUIRED_ERROR],
      annotations: [
        { row: 0, column: 0, text: JSON_REQUIRED_ERROR, type: "error" },
      ],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      validItems: [],
      errors: [INVALID_JSON_ERROR],
      annotations: [
        { row: 0, column: 0, text: INVALID_JSON_ERROR, type: "error" },
      ],
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      validItems: [],
      errors: [ARRAY_REQUIRED_ERROR],
      annotations: [
        { row: 0, column: 0, text: ARRAY_REQUIRED_ERROR, type: "error" },
      ],
    };
  }

  if (parsed.length === 0) {
    return {
      validItems: [],
      errors: [AT_LEAST_ONE_ERROR],
      annotations: [
        { row: 0, column: 0, text: AT_LEAST_ONE_ERROR, type: "error" },
      ],
    };
  }

  const findItemLineNumber = (
    text: string,
    item: unknown,
    itemIndex: number,
  ): number => {
    const itemJson = JSON.stringify(item);

    const lines = text.split("\n");
    let charCount = 0;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const lineEndCharIdx = charCount + line.length;

      if (text.includes(itemJson, charCount)) {
        const searchPos = charCount;
        let braceCount = 0;
        let foundBraceStart = false;

        for (let i = searchPos; i < text.length; i++) {
          if (text[i] === "{") {
            braceCount++;
            foundBraceStart = true;
          } else if (text[i] === "}") {
            braceCount--;
            if (foundBraceStart && braceCount === 0) {
              return lineIdx;
            }
          }
        }
      }
      charCount = lineEndCharIdx + 1;
    }

    return itemIndex + 1;
  };

  const errors: string[] = [];
  const annotations: JsonErrorAnnotation[] = [];
  const validItems: DataListChoiceItem[] = [];
  const seenValues = new Set<string>();

  parsed.forEach((item, index) => {
    const row = findItemLineNumber(trimmed, item, index);
    const col = 0;

    if (!item || typeof item !== "object") {
      const err = `Choice item ${index + 1}: item must be an object.`;
      errors.push(err);
      annotations.push({ row: row, column: col, text: err, type: "error" });
      return;
    }

    const itemObj = item as { label?: unknown; value?: unknown };
    const label = typeof itemObj.label === "string" ? itemObj.label.trim() : "";
    const valueField =
      typeof itemObj.value === "string" ? itemObj.value.trim() : "";

    if (!label) {
      const err = `Choice item ${index + 1}: label is required.`;
      errors.push(err);
      annotations.push({ row: row, column: col, text: err, type: "error" });
    }

    if (!valueField) {
      const err = `Choice item ${index + 1}: value is required.`;
      errors.push(err);
      annotations.push({ row: row, column: col, text: err, type: "error" });
    } else if (seenValues.has(valueField)) {
      const err = `Choice item ${index + 1}: value must be unique.`;
      errors.push(err);
      annotations.push({ row: row, column: col, text: err, type: "error" });
    } else {
      seenValues.add(valueField);
    }

    if (label.length > MAX_FIELD_LENGTH) {
      const err = `Choice item ${index + 1}: label exceeds ${MAX_FIELD_LENGTH} characters.`;
      errors.push(err);
      annotations.push({ row: row, column: col, text: err, type: "error" });
    }

    if (valueField.length > MAX_FIELD_LENGTH) {
      const err = `Choice item ${index + 1}: value exceeds ${MAX_FIELD_LENGTH} characters.`;
      errors.push(err);
      annotations.push({ row: row, column: col, text: err, type: "error" });
    }

    if (
      label &&
      valueField &&
      !errors.some((e) => e.includes(`Choice item ${index + 1}`))
    ) {
      validItems.push({
        label,
        value: valueField,
      });
    }
  });

  return { validItems, errors, annotations };
}

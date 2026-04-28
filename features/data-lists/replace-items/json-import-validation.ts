import type { DataListItem } from "@/lib/endatix-api/data-lists/types";
import { z } from "zod";

export const MAX_FIELD_LENGTH = 255;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ParsedValidation {
  validItems: DataListItem[];
  errors: string[];
}

export function parseAndValidateJson(value: string): ParsedValidation {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      validItems: [],
      errors: ["JSON content is required."],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      validItems: [],
      errors: ["Invalid JSON format."],
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      validItems: [],
      errors: ["JSON root must be an array of objects."],
    };
  }

  if (parsed.length === 0) {
    return {
      validItems: [],
      errors: ["At least one item is required."],
    };
  }

  const errors: string[] = [];
  const validItems: DataListItem[] = [];

  parsed.forEach((item, index) => {
    // TODO: Why not using zod client to validate and also extract to seperate method and test; make sure to add more info to the error output so users can see what was wrong with details
    // Common types push to ../types.ts
    // Shared utils push to ../utils.ts
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
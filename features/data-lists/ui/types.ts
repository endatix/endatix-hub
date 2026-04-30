import type { DataListItem } from "@/lib/endatix-api/data-lists/types";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_FIELD_LENGTH = 255;
export const MAX_PREVIEW_ERRORS = 20;

export const FILE_SIZE_ERROR = "File is too large. Max file size is 5MB.";
export const READ_ERROR = "Failed to read the selected file.";

export interface ParsedValidation {
  validItems: DataListItem[];
  errors: string[];
}

export interface JsonFileHandlerState {
  jsonInput: string;
  validationError: string | null;
  selectedFileName: string | null;
}
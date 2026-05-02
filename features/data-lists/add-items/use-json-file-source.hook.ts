"use client";

import { useCallback, useMemo, useState } from "react";
import { type JsonFileHandlerState, type ParsedValidation } from "../types";
import {
  MAX_FILE_SIZE_BYTES,
  validateJsonInput,
  FILE_SIZE_ERROR,
  READ_ERROR,
} from "../utils";

interface UseJsonFileSourceOptions {
  maxFileSizeBytes?: number;
}

interface UseJsonFileSourceReturn extends JsonFileHandlerState {
  validation: ParsedValidation | null;
  activeError: { row: number; column: number } | null;
  setJsonInput: (value: string) => void;
  setValidationError: (error: string | null) => void;
  handleFileSelected: (file: File | null) => void;
  handleErrorClick: (row: number, column: number) => void;
  reset: () => void;
}

const initialState: JsonFileHandlerState = {
  jsonInput: "",
  validationError: null,
  selectedFileName: null,
};

/**
 * A hook that allows the user to upload or paste a JSON file to replace the items of a data list.
 * @param options - The options for the hook.
 * @returns The hook return value.
 */
export function useJsonFileSource(
  options: UseJsonFileSourceOptions = {},
): UseJsonFileSourceReturn {
  const maxFileSize = options.maxFileSizeBytes ?? MAX_FILE_SIZE_BYTES;

  const [jsonInput, setJsonInputState] = useState<string>(
    initialState.jsonInput,
  );
  const [validationError, setValidationError] = useState<string | null>(
    initialState.validationError,
  );
  const [selectedFileName, setSelectedFileName] = useState<string | null>(
    initialState.selectedFileName,
  );
  const [activeError, setActiveError] = useState<{
    row: number;
    column: number;
  } | null>(null);

  const validation = useMemo(() => {
    if (!jsonInput.trim()) {
      return null;
    }
    return validateJsonInput(jsonInput);
  }, [jsonInput]);

  const setJsonInput = useCallback((value: string) => {
    setJsonInputState(value);
    setActiveError(null);
  }, []);

  const reset = useCallback(() => {
    setJsonInputState(initialState.jsonInput);
    setValidationError(initialState.validationError);
    setSelectedFileName(initialState.selectedFileName);
    setActiveError(null);
  }, []);

  const handleErrorClick = useCallback((row: number, column: number) => {
    setActiveError({ row, column });
  }, []);

  const handleFileSelected = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      if (file.size > maxFileSize) {
        setJsonInputState(initialState.jsonInput);
        setValidationError(FILE_SIZE_ERROR);
        setSelectedFileName(file.name);
        return;
      }

      try {
        const content = await file.text();
        setSelectedFileName(file.name);
        setJsonInputState(content);
        setActiveError(null);
      } catch {
        setValidationError(READ_ERROR);
      }
    },
    [maxFileSize, setValidationError, setSelectedFileName],
  );

  return {
    jsonInput,
    validation,
    validationError,
    selectedFileName,
    activeError,
    setJsonInput,
    setValidationError,
    handleFileSelected,
    handleErrorClick,
    reset,
  };
}

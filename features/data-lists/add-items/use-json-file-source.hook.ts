"use client";

import { useCallback, useMemo, useState } from "react";
import { type JsonFileHandlerState, type ParsedValidation } from "../types";
import {
  MAX_FILE_SIZE_BYTES,
  validateJsonInput,
  FILE_SIZE_ERROR,
  READ_ERROR,
} from "../utils";

interface ErrorPointer {
  row: number;
  column: number;
}

interface UseJsonFileSourceOptions {
  maxFileSizeBytes?: number;
}

interface UseJsonFileSourceReturn extends JsonFileHandlerState {
  validation: ParsedValidation | null;
  activeError: ErrorPointer | null;
  setJsonInput: (value: string) => void;
  setValidationError: (error: string | null) => void;
  handleFileSelected: (file: File | null) => void;
  handleErrorClick: (error: ErrorPointer) => void;
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

  const [jsonInput, setJsonInput] = useState<string>(initialState.jsonInput);
  const [validationError, setValidationError] = useState<string | null>(
    initialState.validationError,
  );
  const [selectedFileName, setSelectedFileName] = useState<string | null>(
    initialState.selectedFileName,
  );
  const [activeError, setActiveError] = useState<ErrorPointer | null>(null);

  const validation = useMemo(() => {
    if (!jsonInput.trim()) {
      return null;
    }
    return validateJsonInput(jsonInput);
  }, [jsonInput]);

  const setJsonInputInternal = useCallback((value: string) => {
    setJsonInput(value);
    setActiveError(null);
  }, []);

  const reset = useCallback(() => {
    setJsonInput(initialState.jsonInput);
    setValidationError(initialState.validationError);
    setSelectedFileName(initialState.selectedFileName);
    setActiveError(null);
  }, []);

  const handleErrorClick = useCallback((error: ErrorPointer) => {
    setActiveError(error);
  }, []);

  const handleFileSelected = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      if (file.size > maxFileSize) {
        setJsonInput(initialState.jsonInput);
        setValidationError(FILE_SIZE_ERROR);
        setSelectedFileName(file.name);
        return;
      }

      try {
        const content = await file.text();
        setSelectedFileName(file.name);
        setJsonInput(content);
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
    setJsonInput: setJsonInputInternal,
    setValidationError,
    handleFileSelected,
    handleErrorClick,
    reset,
  };
}

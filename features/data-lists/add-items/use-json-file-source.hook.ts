"use client";

import { useCallback, useMemo, useState } from "react";
import {
  FILE_SIZE_ERROR,
  MAX_FILE_SIZE_BYTES,
  parseAndValidateJson,
  READ_ERROR,
  type JsonFileHandlerState as JsonFileSourceHookState,
  type ParsedValidation,
} from "./types";

interface UseJsonFileSourceOptions {
  maxFileSizeBytes?: number;
}

interface UseJsonFileSourceReturn extends JsonFileSourceHookState {
  validation: ParsedValidation | null;
  activeError: { row: number; column: number } | null;
  setJsonInput: (value: string) => void;
  setValidationError: (error: string | null) => void;
  handleFileSelected: (file: File | null) => void;
  handleErrorClick: (row: number, column: number) => void;
  reset: () => void;
}

const initialState: JsonFileSourceHookState = {
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
  const [validationError, setValidationErrorState] = useState<string | null>(
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
    return parseAndValidateJson(jsonInput);
  }, [jsonInput]);

  const setJsonInput = useCallback((value: string) => {
    setJsonInputState(value);
    setActiveError(null);
  }, []);

  const reset = useCallback(() => {
    setJsonInputState(initialState.jsonInput);
    setValidationErrorState(initialState.validationError);
    setSelectedFileName(initialState.selectedFileName);
    setActiveError(null);
  }, []);

  const setValidationError = useCallback((error: string | null) => {
    setValidationErrorState(error);
  }, []);

  const handleErrorClick = useCallback((row: number, column: number) => {
    setActiveError({ row, column });
  }, []);

  const handleFileSelected = useCallback(
    (file: File | null) => {
      if (!file) {
        return;
      }

      if (file.size > maxFileSize) {
        setJsonInputState(initialState.jsonInput);
        setValidationErrorState(FILE_SIZE_ERROR);
        setSelectedFileName(file.name);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const content = String(reader.result ?? "");
        setSelectedFileName(file.name);
        setJsonInputState(content);
        setActiveError(null);
      };
      reader.onerror = () => {
        setValidationErrorState(READ_ERROR);
      };
      reader.readAsText(file);
    },
    [maxFileSize, setValidationErrorState, setSelectedFileName],
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

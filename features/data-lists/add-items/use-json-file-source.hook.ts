"use client";

import { useCallback, useState } from "react";
import {
  FILE_SIZE_ERROR,
  MAX_FILE_SIZE_BYTES,
  READ_ERROR,
  type JsonFileHandlerState as JsonFileSourceHookState,
} from "./types";

interface UseJsonFileSourceOptions {
  maxFileSizeBytes?: number;
}

interface UseJsonFileSourceReturn extends JsonFileSourceHookState {
  setJsonInput: (value: string) => void;
  setValidationError: (error: string | null) => void;
  handleFileSelected: (file: File | null) => void;
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

  const [jsonInput, setJsonInput] = useState<string>(initialState.jsonInput);
  const [validationError, setValidationErrorState] = useState<string | null>(
    initialState.validationError,
  );
  const [selectedFileName, setSelectedFileName] = useState<string | null>(
    initialState.selectedFileName,
  );

  const reset = useCallback(() => {
    setJsonInput(initialState.jsonInput);
    setValidationErrorState(initialState.validationError);
    setSelectedFileName(initialState.selectedFileName);
  }, []);

  const setValidationError = useCallback((error: string | null) => {
    setValidationErrorState(error);
  }, []);

  const handleFileSelected = useCallback(
    (file: File | null) => {
      if (!file) {
        return;
      }

      if (file.size > maxFileSize) {
        setJsonInput(initialState.jsonInput);
        setValidationErrorState(FILE_SIZE_ERROR);
        setSelectedFileName(file.name);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => { 
        const content = String(reader.result ?? "");
        setSelectedFileName(file.name);
        setJsonInput(content);
      };
      reader.onerror = () => {
        setValidationErrorState(READ_ERROR);
      };
      reader.readAsText(file);
    },
    [maxFileSize, setValidationErrorState, setJsonInput, setSelectedFileName],
  );

  return {
    jsonInput,
    validationError,
    selectedFileName,
    setJsonInput,
    setValidationError,
    handleFileSelected,
    reset,
  };
}

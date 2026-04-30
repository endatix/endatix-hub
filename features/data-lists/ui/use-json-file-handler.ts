"use client";

import { useCallback, useState } from "react";
import {
  FILE_SIZE_ERROR,
  MAX_FILE_SIZE_BYTES,
  READ_ERROR,
  type JsonFileHandlerState,
} from "./types";

interface UseJsonFileHandlerOptions {
  maxFileSizeBytes?: number;
}

interface UseJsonFileHandlerReturn extends JsonFileHandlerState {
  setJsonInput: (value: string) => void;
  handleFileSelected: (file: File | null) => void;
  reset: () => void;
}

const initialState: JsonFileHandlerState = {
  jsonInput: "",
  validationError: null,
  selectedFileName: null,
};

export function useJsonFileHandler(
  options: UseJsonFileHandlerOptions = {},
): UseJsonFileHandlerReturn {
  const maxFileSize = options.maxFileSizeBytes ?? MAX_FILE_SIZE_BYTES;

  const [jsonInput, setJsonInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const reset = useCallback(() => {
    setJsonInput("");
    setValidationError(null);
    setSelectedFileName(null);
  }, []);

  const handleFileSelected = useCallback(
    (file: File | null) => {
      if (!file) {
        return;
      }

      if (file.size > maxFileSize) {
        setJsonInput("");
        setValidationError(FILE_SIZE_ERROR);
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
        setValidationError(READ_ERROR);
      };
      reader.readAsText(file);
    },
    [maxFileSize],
  );

  return {
    jsonInput,
    validationError,
    selectedFileName,
    handleFileSelected,
    reset,
  };
}
"use client";

import { useCallback, useMemo, useState } from "react";
import type { JsonFileHandlerState, ParsedValidation } from "../types";
import {
  CSV_FILE_SIZE_ERROR,
  FILE_SIZE_ERROR,
  MAX_FILE_SIZE_BYTES,
  READ_ERROR,
  validateJsonInput,
} from "../utils";
import { discoverLocalesFromTranslationsCsv } from "../translations/parse-translations-csv";
import {
  DATA_LIST_MAX_CSV_CHARS,
  type LocaleDiscoveryOptions,
  type LocaleImportDiscovery,
} from "../translations/locale-discovery";
import type { DataListSourceFormat } from "./data-list-items-input";

interface ErrorPointer {
  row: number;
  column: number;
}

export interface UseDataListSourceOptions extends Omit<
  LocaleDiscoveryOptions,
  "availableLocales"
> {
  availableLocales?: string[];
  maxFileSizeBytes?: number;
  initialFormat?: DataListSourceFormat;
}

export interface UseDataListSourceReturn extends JsonFileHandlerState {
  format: DataListSourceFormat;
  setFormat: (format: DataListSourceFormat) => void;
  csvInput: string;
  setCsvInput: (value: string) => void;
  validation: ParsedValidation | null;
  csvDiscovery: LocaleImportDiscovery | null;
  /** True when the active format has a payload ready for locale confirm. */
  canConfirm: boolean;
  hasSourceContent: boolean;
  sourceError: string | null;
  activeError: ErrorPointer | null;
  setJsonInput: (value: string) => void;
  setValidationError: (error: string | null) => void;
  handleFileSelected: (file: File | null) => Promise<void>;
  handleErrorClick: (error: ErrorPointer) => void;
  reset: () => void;
}

const initialState: JsonFileHandlerState = {
  jsonInput: "",
  validationError: null,
  selectedFileName: null,
};

const EMPTY_AVAILABLE_LOCALES: string[] = [];

function resolveCsvSourceError(
  discovery: LocaleImportDiscovery | null,
): string | null {
  if (!discovery) {
    return null;
  }

  if (discovery.structuralErrors.length > 0) {
    return discovery.structuralErrors[0];
  }

  if (discovery.invalidLocales.length > 0) {
    return `Invalid locale columns: ${discovery.invalidLocales.join(", ")}.`;
  }

  return null;
}

function resolveJsonSourceError(
  validation: ParsedValidation | null,
): string | null {
  if (!validation || validation.errors.length === 0) {
    return null;
  }

  return validation.errors[0];
}

function resolveSourceError(
  format: DataListSourceFormat,
  discovery: LocaleImportDiscovery | null,
  validation: ParsedValidation | null,
): string | null {
  switch (format) {
    case "csv":
      return resolveCsvSourceError(discovery);
    case "json":
      return resolveJsonSourceError(validation);
  }
}

/**
 * Shared Create/Replace source state for JSON and CSV upload.
 */
export function useDataListSource(
  options: UseDataListSourceOptions = {},
): UseDataListSourceReturn {
  const maxFileSize = options.maxFileSizeBytes ?? MAX_FILE_SIZE_BYTES;
  const defaultLocale = options.defaultLocale;

  const [format, setFormat] = useState<DataListSourceFormat>(
    options.initialFormat ?? "json",
  );
  const [jsonInput, setJsonInput] = useState<string>(initialState.jsonInput);
  const [csvInput, setCsvInput] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(
    initialState.validationError,
  );
  const [selectedFileName, setSelectedFileName] = useState<string | null>(
    initialState.selectedFileName,
  );
  const [activeError, setActiveError] = useState<ErrorPointer | null>(null);

  const validation = useMemo(() => {
    if (format !== "json" || !jsonInput.trim()) {
      return null;
    }
    return validateJsonInput(jsonInput, { defaultLocale });
  }, [defaultLocale, format, jsonInput]);

  const availableLocalesKey = (
    options.availableLocales ?? EMPTY_AVAILABLE_LOCALES
  ).join(",");

  const csvDiscovery = useMemo(() => {
    if (format !== "csv" || !csvInput.trim()) {
      return null;
    }
    return discoverLocalesFromTranslationsCsv(csvInput, {
      availableLocales: availableLocalesKey
        ? availableLocalesKey.split(",")
        : EMPTY_AVAILABLE_LOCALES,
      defaultLocale,
    });
  }, [availableLocalesKey, csvInput, defaultLocale, format]);

  const canConfirm = useMemo(() => {
    if (format === "json") {
      return (
        validation !== null &&
        validation.validItems.length > 0 &&
        validation.errors.length === 0
      );
    }

    return (
      csvDiscovery !== null &&
      csvDiscovery.canProceed &&
      csvDiscovery.rowCount > 0
    );
  }, [csvDiscovery, format, validation]);

  const sourceError = useMemo(
    () => resolveSourceError(format, csvDiscovery, validation),
    [csvDiscovery, format, validation],
  );

  const hasSourceContent = useMemo(() => {
    if (format === "csv") {
      return csvInput.trim().length > 0;
    }
    return jsonInput.trim().length > 0;
  }, [csvInput, format, jsonInput]);

  const applyJsonInput = useCallback((value: string) => {
    setJsonInput(value);
    setActiveError(null);
  }, []);

  const applyCsvInput = useCallback((value: string) => {
    setCsvInput(value);
    setActiveError(null);
  }, []);

  const applyFormat = useCallback((next: DataListSourceFormat) => {
    setFormat(next);
    setSelectedFileName(null);
    setValidationError(null);
    setActiveError(null);
  }, []);

  const reset = useCallback(() => {
    setFormat(options.initialFormat ?? "json");
    setJsonInput(initialState.jsonInput);
    setCsvInput("");
    setValidationError(initialState.validationError);
    setSelectedFileName(initialState.selectedFileName);
    setActiveError(null);
  }, [options.initialFormat]);

  const handleErrorClick = useCallback((error: ErrorPointer) => {
    setActiveError(error);
  }, []);

  const handleFileSelected = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      const lowerName = file.name.toLowerCase();
      const inferredCsv =
        lowerName.endsWith(".csv") ||
        file.type === "text/csv" ||
        file.type === "application/vnd.ms-excel";
      const treatAsCsv = inferredCsv || format === "csv";
      const maxBytes = treatAsCsv ? DATA_LIST_MAX_CSV_CHARS : maxFileSize;

      if (file.size > maxBytes) {
        setJsonInput(initialState.jsonInput);
        setCsvInput("");
        setValidationError(treatAsCsv ? CSV_FILE_SIZE_ERROR : FILE_SIZE_ERROR);
        setSelectedFileName(file.name);
        return;
      }

      try {
        const content = await file.text();
        setSelectedFileName(file.name);
        setValidationError(null);
        setActiveError(null);

        if (treatAsCsv) {
          if (content.length > DATA_LIST_MAX_CSV_CHARS) {
            setCsvInput("");
            setJsonInput("");
            setValidationError(CSV_FILE_SIZE_ERROR);
            return;
          }

          setFormat("csv");
          setCsvInput(content);
          setJsonInput("");
          return;
        }

        setFormat("json");
        setJsonInput(content);
        setCsvInput("");
      } catch {
        setValidationError(READ_ERROR);
      }
    },
    [format, maxFileSize],
  );

  return {
    format,
    setFormat: applyFormat,
    jsonInput,
    csvInput,
    setCsvInput: applyCsvInput,
    validation,
    csvDiscovery,
    canConfirm,
    hasSourceContent,
    sourceError,
    validationError,
    selectedFileName,
    activeError,
    setJsonInput: applyJsonInput,
    setValidationError,
    handleFileSelected,
    handleErrorClick,
    reset,
  };
}

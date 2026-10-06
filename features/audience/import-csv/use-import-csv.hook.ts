"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { importAudienceCsvAction } from "./import-audience-csv.action";
import type { AudienceImportResult } from "@/lib/endatix-api/audience/types";
import {
  countCsvDataRows,
  exceedsImportLimit,
  MAX_IMPORT_ROWS,
  readCsvHeaders,
} from "./csv-preview";
import {
  importableProperties,
  propertyColumnMap,
  SKIP_COLUMN,
} from "./column-map";

type Step = "file" | "map" | "result";

export function useImportCsv(formId: string, properties: AudienceProperty[]) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("file");
  const [fileName, setFileName] = useState("audience.csv");
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [identifierColumn, setIdentifierColumn] = useState("");
  const [columns, setColumns] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AudienceImportResult | null>(null);

  function reset(): void {
    setStep("file");
    setError(null);
    setCsvText("");
    setHeaders([]);
    setIdentifierColumn("");
    setColumns({});
    setResult(null);
  }

  function openChange(next: boolean): void {
    setOpen(next);
    if (!next) reset();
  }

  function loadFile(file: File): void {
    setError(null);
    setFileName(file.name || "audience.csv");
    void file.text().then((text) => {
      const nextHeaders = readCsvHeaders(text);
      if (!nextHeaders) return setError("The file has no header row.");
      if (exceedsImportLimit(countCsvDataRows(text))) {
        return setError(`CSV exceeds the maximum of ${MAX_IMPORT_ROWS} data rows.`);
      }
      setCsvText(text);
      setHeaders(nextHeaders);
      setIdentifierColumn(nextHeaders[0] ?? "");
      setColumns(
        Object.fromEntries(
          importableProperties(properties).map((property) => [
            property.variableName,
            SKIP_COLUMN,
          ]),
        ),
      );
      setStep("map");
    });
  }

  function setPropertyColumn(variableName: string, column: string): void {
    setColumns((current) => ({ ...current, [variableName]: column }));
  }

  function submit(): void {
    setError(null);
    startTransition(async () => {
      const imported = await importAudienceCsvAction({
        formId,
        csvText,
        identifierColumn,
        fileName,
        propertyColumns: propertyColumnMap(columns),
      });
      if (Result.isError(imported)) return setError(imported.message);
      setResult(imported.value);
      setStep("result");
      router.refresh();
    });
  }

  return {
    open,
    pending,
    error,
    step,
    headers,
    identifierColumn,
    setIdentifierColumn,
    columns,
    setPropertyColumn,
    result,
    rowCount: countCsvDataRows(csvText),
    openChange,
    loadFile,
    submit,
  };
}

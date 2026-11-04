"use client";

import { useRef, useState } from "react";
import type { AudienceImportLimits } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import type { CsvRow } from "@/lib/utils/csv";
import { readCsvFile, type CsvFile, type CsvPreview } from "./csv-preview";
import {
  firstOversizedChunk,
  IMPORT_CHUNK_BODY_BYTES,
  IMPORT_CHUNK_ROWS,
} from "./import-chunk-payload";
import { sizeLabel } from "./import-labels";

export type LoadedFile = { name: string; preview: CsvPreview; rows: CsvRow[] };

const NO_FILE: FileState = { file: null, problem: null };
const UNREADABLE = "The file could not be read. Save it as CSV and try again.";

/**
 * Why the file cannot be sent: a chunk whose request would be over the server action body limit.
 * Checked before the import starts, so no chunk is refused or retried halfway through.
 */
function chunkProblem({ preview, rows }: CsvFile): string | null {
  const place = {
    chunkSize: IMPORT_CHUNK_ROWS,
    columns: preview.headers.length,
  };
  const oversized = firstOversizedChunk(rows, place, IMPORT_CHUNK_BODY_BYTES);
  if (!oversized) return null;
  const { firstRowNumber, lastRowNumber } = oversized;
  return `Rows ${firstRowNumber.toLocaleString()} to ${lastRowNumber.toLocaleString()} are too long to send together: over ${sizeLabel(IMPORT_CHUNK_BODY_BYTES)} in one request. Shorten the longest cells, or split the file.`;
}

export async function readFile(
  picked: File,
  limits: AudienceImportLimits,
): Promise<Result<LoadedFile>> {
  if (picked.size > limits.maxBytes) {
    return Result.validationError(
      `The file is ${sizeLabel(picked.size)}. Import files up to ${sizeLabel(limits.maxBytes)}.`,
    );
  }
  try {
    const read = readCsvFile(await picked.text(), limits.maxRows);
    if (Result.isError(read)) return read;
    const problem = chunkProblem(read.value);
    if (problem) return Result.validationError(problem);
    const name = picked.name || "audience.csv";
    return Result.success({ name, ...read.value });
  } catch {
    return Result.validationError(UNREADABLE);
  }
}

type FileState = { file: LoadedFile | null; problem: string | null };

const fileStateOf = (read: Result<LoadedFile>): FileState =>
  Result.isError(read)
    ? { file: null, problem: read.message }
    : { file: read.value, problem: null };

/** The chosen file and its preview, or why it cannot be imported; `onRead` gets the file. */
export function useImportFile(
  limits: AudienceImportLimits,
  onRead: (file: LoadedFile) => void,
) {
  const [state, setState] = useState<FileState>(NO_FILE);
  const generation = useRef(0);
  const pick = async (picked: File) => {
    const current = ++generation.current;
    const read = await readFile(picked, limits);
    if (current !== generation.current) return;
    setState(fileStateOf(read));
    if (Result.isSuccess(read)) onRead(read.value);
  };
  const reset = () => {
    generation.current += 1;
    setState(NO_FILE);
  };
  return { ...state, pick, reset };
}

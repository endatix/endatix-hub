import {
  AudienceImportStatus,
  type AudienceImportChunk,
  type AudienceImportView,
} from "@/lib/endatix-api/audience/types";
import { ErrorType, Result, type Error as ResultError } from "@/lib/result";
import type { CsvRow } from "@/lib/utils/csv";
import { rowCountLabel } from "./import-labels";

/** Where a chunk sits in the file, and how many cells a row may carry. */
export type ChunkPlace = { index: number; chunkSize: number; columns: number };

/** Row 1 is the header row, so the first data row is row 2. */
const FIRST_DATA_ROW = 2;

/**
 * Chunk `index` of the file's data rows, as the API stages it: cells trimmed (the API's own
 * parser trimmed them) and cut to the header's width (it read cells by header).
 */
export function importChunk(
  rows: readonly CsvRow[],
  { index, chunkSize, columns }: ChunkPlace,
): AudienceImportChunk {
  const first = index * chunkSize;
  return {
    firstRowNumber: first + FIRST_DATA_ROW,
    rows: rows.slice(first, first + chunkSize).map((row) => ({
      cells: row.cells.slice(0, columns).map((cell) => cell.trim()),
      malformed: row.malformed,
    })),
  };
}

const POLLED = new Set<string>([
  AudienceImportStatus.Checking,
  AudienceImportStatus.Writing,
]);
const CANCELABLE: readonly string[] = [
  AudienceImportStatus.Uploading,
  AudienceImportStatus.Checking,
  AudienceImportStatus.Checked,
];
const UNFINISHED = new Set<string>([
  ...CANCELABLE,
  AudienceImportStatus.Writing,
]);

/** The server is working on it: read it again until it moves on. */
export const isPolling = (status: string) => POLLED.has(status);

/** Nothing is written yet, so the scripter may still stop it. */
export const canCancel = (status: string) => CANCELABLE.includes(status);

/** It will not move again; a status this Hub does not know counts as one. */
export const isTerminal = (status: string) => !UNFINISHED.has(status);

export type UploadRequest = {
  missing: readonly number[];
  send: (index: number) => Promise<Result<AudienceImportView>>;
  onSent: (index: number) => void;
  /** When false after a chunk finishes, no further chunks are sent. */
  shouldContinue?: () => boolean;
};

/**
 * Worth one more try: a thrown call (no status) or a server that is busy or down (5xx). A validation
 * error, from the Hub or the API, fails the same way every time.
 */
const isTransient = (failed: ResultError) =>
  failed.errorType !== ErrorType.ValidationError &&
  (failed.statusCode === undefined || failed.statusCode >= 500);

async function sendWithRetry(
  send: UploadRequest["send"],
  index: number,
): Promise<Result<AudienceImportView>> {
  const result = await send(index);
  return Result.isError(result) && isTransient(result) ? send(index) : result;
}

/**
 * Sends the missing chunks one after another, a transient failure retried once. Next dispatches
 * server actions one at a time per client, so parallel sends would only queue; sending in order
 * keeps Cancel behind at most one chunk. The first chunk that still fails stops the upload.
 * Returns the last view, or `null` when nothing was missing.
 */
export async function uploadChunks({
  missing,
  send,
  onSent,
  shouldContinue = () => true,
}: UploadRequest): Promise<Result<AudienceImportView | null>> {
  let latest: AudienceImportView | null = null;
  for (const index of missing) {
    if (!shouldContinue()) break;
    const result = await sendWithRetry(send, index);
    if (Result.isError(result)) return result;
    latest = result.value;
    onSent(index);
    if (!shouldContinue()) break;
  }
  return Result.success(latest);
}

/** The file a cut-off upload continues from: its name, header row and data rows. */
export type UploadFile = { name: string; headers: string[]; rows: CsvRow[] };

/**
 * Why a re-chosen file cannot continue this upload, or `null`. Chunks are positional against the
 * header row the import started with, so another file of the same length would stage wrong cells.
 */
export function sameFileProblem(
  view: AudienceImportView,
  file: UploadFile,
): string | null {
  const again = `Choose ${view.fileName} again.`;
  if (file.name !== view.fileName) {
    return `This file is ${file.name}, but the import is of ${view.fileName}. ${again}`;
  }
  if (file.rows.length !== view.upload.rowCount) {
    return `This file has ${rowCountLabel(file.rows.length)}, but the import has ${rowCountLabel(view.upload.rowCount)}. ${again}`;
  }
  // An import recorded by the one-request route has no header row ([]); name and rows must do.
  const { headers } = view;
  const same =
    !headers?.length ||
    (headers.length === file.headers.length &&
      headers.every((header, at) => header === file.headers[at]));
  return same ? null : `This file's columns differ from the import's. ${again}`;
}

/** Rows chunk `index` holds: `chunkSize`, fewer in the last chunk. */
export function chunkRowCount(
  { rowCount, chunkSize }: AudienceImportView["upload"],
  index: number,
): number {
  return Math.max(0, Math.min(chunkSize, rowCount - index * chunkSize));
}

/** Rows the API already holds for an uploading import: every chunk it is not missing. */
export function rowsSent(view: AudienceImportView): number {
  const missing = view.upload.missingChunks.reduce(
    (rows, index) => rows + chunkRowCount(view.upload, index),
    0,
  );
  return view.upload.rowCount - missing;
}

/** Participants a confirm would write: a test import skips those already on the form. */
export function confirmCount({ check, isTest }: AudienceImportView): number {
  if (!check) return 0;
  return isTest ? check.newCount : check.newCount + check.existingCount;
}

import {
  AudienceImportStatus,
  type AudienceImportChunk,
  type AudienceImportView,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
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

const POLLED: readonly string[] = [
  AudienceImportStatus.Checking,
  AudienceImportStatus.Writing,
];
const CANCELABLE: readonly string[] = [
  AudienceImportStatus.Uploading,
  AudienceImportStatus.Checking,
  AudienceImportStatus.Checked,
];
const UNFINISHED: readonly string[] = [
  ...CANCELABLE,
  AudienceImportStatus.Writing,
];

/** The server is working on it: read it again until it moves on. */
export const isPolling = (status: string) => POLLED.includes(status);

/** Nothing is written yet, so the scripter may still stop it. */
export const canCancel = (status: string) => CANCELABLE.includes(status);

/** It will not move again; a status this Hub does not know counts as one. */
export const isTerminal = (status: string) => !UNFINISHED.includes(status);

const CONFLICT = 409;

export type UploadRequest = {
  missing: readonly number[];
  send: (index: number) => Promise<Result<AudienceImportView>>;
  onSent: (index: number) => void;
  concurrency?: number;
  retries?: number;
};

type UploadState = {
  queue: number[];
  failure: Result<AudienceImportView> | null;
  latest: AudienceImportView | null;
};

async function sendWithRetry(
  request: UploadRequest,
  index: number,
): Promise<Result<AudienceImportView>> {
  let result = await request.send(index);
  for (let retry = 0; retry < (request.retries ?? 1); retry++) {
    if (Result.isSuccess(result) || result.statusCode === CONFLICT) break;
    result = await request.send(index);
  }
  return result;
}

/** Keeps the view that moved past uploading: responses to parallel chunks arrive in any order. */
function newer(
  latest: AudienceImportView | null,
  view: AudienceImportView,
): AudienceImportView {
  const uploading = view.status === AudienceImportStatus.Uploading;
  return latest && latest.status !== AudienceImportStatus.Uploading && uploading
    ? latest
    : view;
}

async function worker(request: UploadRequest, state: UploadState) {
  while (state.queue.length > 0 && !state.failure) {
    const index = state.queue.shift()!;
    const result = await sendWithRetry(request, index);
    if (Result.isError(result)) {
      state.failure ??= result;
      return;
    }
    state.latest = newer(state.latest, result.value);
    request.onSent(index);
  }
}

/**
 * Sends the missing chunks a few at a time, each retried once. The first chunk that still fails
 * stops the upload; a 409 (the import takes no more rows) is not retried. Returns the newest view,
 * or `null` when nothing was missing.
 */
export async function uploadChunks(
  request: UploadRequest,
): Promise<Result<AudienceImportView | null>> {
  const state: UploadState = {
    queue: [...request.missing],
    failure: null,
    latest: null,
  };
  const workers = Array.from({ length: request.concurrency ?? 3 }, () =>
    worker(request, state),
  );
  await Promise.all(workers);
  return state.failure ?? Result.success(state.latest);
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
    return `This file has ${rowCountLabel(file.rows.length)}, but the import has ${view.upload.rowCount.toLocaleString()}. ${again}`;
  }
  const { headers } = view;
  const same =
    !headers ||
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

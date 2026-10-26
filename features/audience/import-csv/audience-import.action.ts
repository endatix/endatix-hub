"use server";

import { Permissions } from "@/features/auth/authorization";
import type {
  AudienceImportMove,
  AudienceImportView,
  IndexedImportChunk,
  StartAudienceImportRequest,
} from "@/lib/endatix-api/audience/types";
import { Result, type Result as ResultType } from "@/lib/result";
import {
  appendPendingRows,
  pendingChunkKey,
  pendingRowCount,
  takePendingRows,
} from "./audience-import-chunk-buffer.server";
import {
  chunkIndexProblem,
  IMPORT_CHUNK_BODY_BYTES,
  importChunkJsonBytes,
} from "./import-chunk-payload";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

const IMPORT_LOG = {
  permission: Permissions.Forms.Edit,
  logMessage: "Failed to import participants.",
  loggerName: "audience.import",
} as const;

type ImportRef = { formId: string; importId: string };

/** Starts a staged import after the Columns step. A 409 means the form already has one running. */
export async function startAudienceImportAction({
  formId,
  ...request
}: StartAudienceImportRequest & {
  formId: string;
}): Promise<Result<AudienceImportView>> {
  return withHubAudienceApi(
    (api) => api.audience.startImport(formId, request),
    {
      ...IMPORT_LOG,
      fallbackMessage: "The import could not start.",
    },
  );
}

export async function sendAudienceImportChunkAction({
  formId,
  importId,
  chunk,
  expectedRows,
}: ImportRef & {
  chunk: IndexedImportChunk;
  /** When the chunk is split across calls, how many rows the index must hold before staging. */
  expectedRows?: number;
}): Promise<ResultType<AudienceImportView>> {
  const indexProblem = chunkIndexProblem(chunk.index);
  if (indexProblem) return Result.validationError(indexProblem);
  if (importChunkJsonBytes(chunk) > IMPORT_CHUNK_BODY_BYTES) {
    return Result.validationError(
      "This part of the file is too large to send in one request.",
    );
  }

  const key = pendingChunkKey(formId, importId, chunk.index);
  let staged = chunk;
  if (expectedRows !== undefined && chunk.rows.length < expectedRows) {
    appendPendingRows(key, chunk.rows);
    const merged = pendingRowCount(key);
    if (merged < expectedRows) {
      return getAudienceImportAction({ formId, importId });
    }
    staged = {
      ...chunk,
      rows: takePendingRows(key),
    };
  }

  return withHubAudienceApi(
    (api) => api.audience.sendImportChunk(formId, importId, staged),
    { ...IMPORT_LOG, fallbackMessage: "Part of the file could not be sent." },
  );
}

/** One import, or with `importId: "current"` the form's unfinished one. A background read. */
export async function getAudienceImportAction({
  formId,
  importId,
}: ImportRef): Promise<Result<AudienceImportView>> {
  return withHubAudienceApi((api) => api.audience.getImport(formId, importId), {
    ...IMPORT_LOG,
    fallbackMessage: "The import could not be read.",
    background: true,
  });
}

/** Confirms or resumes (`writing`), or cancels; the People list behind it is revalidated. */
export async function moveAudienceImportAction({
  formId,
  importId,
  to,
}: ImportRef & { to: AudienceImportMove }): Promise<
  Result<AudienceImportView>
> {
  return withHubAudienceApi(
    (api) => api.audience.moveImport(formId, importId, to),
    {
      ...IMPORT_LOG,
      fallbackMessage: "The import could not be changed.",
      formId,
    },
  );
}

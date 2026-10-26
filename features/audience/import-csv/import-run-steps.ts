import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  AudienceImportStatus,
  CURRENT_IMPORT,
  type AudienceImportMove,
  type AudienceImportView,
  type StartAudienceImportRequest,
} from "@/lib/endatix-api/audience/types";
import { Result, type Error as ResultError } from "@/lib/result";
import {
  getAudienceImportAction,
  moveAudienceImportAction,
  sendAudienceImportChunkAction,
  startAudienceImportAction,
} from "./audience-import.action";
import {
  chunkRowCount,
  importChunk,
  isTerminal,
  rowsSent,
  sameFileProblem,
  uploadChunks,
  type UploadFile,
} from "./import-run";

const CONFLICT = 409;
const REJECTED = "Something went wrong. Try again.";
const ALREADY_RUNNING =
  "An import of this form is already running, so it is shown instead of your file.";

/**
 * Where the form's import stands. `uploading` is this tab sending the file; `server` is anything
 * the API reports, rendered by `view.status`, including an upload this tab cannot finish alone.
 */
export type RunState =
  | { kind: "idle" }
  | { kind: "uploading"; view: AudienceImportView; sent: number }
  | { kind: "server"; view: AudienceImportView };

/** The rows this tab can send for one import, so a failed upload can be sent again. */
export type HeldFile = UploadFile & { importId: string };

/** What the steps below read and set: the hook's state, owned by `useAudienceImport`. */
export type RunContext = {
  formId: string;
  setState: Dispatch<SetStateAction<RunState>>;
  setError: (error: string | null) => void;
  setNotice: (notice: string | null) => void;
  setPending: (pending: boolean) => void;
  file: RefObject<HeldFile | null>;
};

export async function safely<T>(call: Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await call;
  } catch {
    return Result.error<T>(REJECTED);
  }
}

export const readImport = (formId: string, importId: string) =>
  safely(getAudienceImportAction({ formId, importId }));

/**
 * Whether a view read now may replace what is on screen: only for the import shown, and never
 * moving one that ended back to a running status (a read that left before the move landed late).
 */
function replaces(current: RunState, view: AudienceImportView): boolean {
  if (current.kind === "idle" || current.view.importId !== view.importId)
    return false;
  return !hasEnded(current.view) || hasEnded(view);
}

/** It will not move again: a stopped write that can resume has not ended. */
const hasEnded = (view: AudienceImportView) =>
  isTerminal(view.status) && !view.canResume;

/** Shows a newer view of the import on screen; an ended import lets go of the file's rows. */
export function showView(ctx: RunContext, view: AudienceImportView) {
  if (isTerminal(view.status) && ctx.file.current?.importId === view.importId)
    ctx.file.current = null;
  ctx.setState((current) =>
    replaces(current, view) ? { kind: "server", view } : current,
  );
}

function markSent(ctx: RunContext, view: AudienceImportView, index: number) {
  const rows = chunkRowCount(view.upload, index);
  ctx.setState((current) =>
    current.kind === "uploading" && current.view.importId === view.importId
      ? {
          ...current,
          sent: Math.min(view.upload.rowCount, current.sent + rows),
        }
      : current,
  );
}

function chunkSender(
  formId: string,
  view: AudienceImportView,
  file: UploadFile,
) {
  const { importId, upload } = view;
  const place = { chunkSize: upload.chunkSize, columns: file.headers.length };
  return (index: number) =>
    safely(
      sendAudienceImportChunkAction({
        formId,
        importId,
        chunk: { index, ...importChunk(file.rows, { index, ...place }) },
      }),
    );
}

/** The view that moved past uploading, or a fresh read when the upload stopped short. */
async function showLatest(
  ctx: RunContext,
  view: AudienceImportView,
  moved: AudienceImportView | null,
) {
  if (moved && moved.status !== AudienceImportStatus.Uploading)
    return showView(ctx, moved);
  const fresh = await readImport(ctx.formId, view.importId);
  showView(ctx, Result.isSuccess(fresh) ? fresh.value : view);
}

/** Sends the chunks the view still misses, counting rows as they land. */
export async function uploadRows(
  ctx: RunContext,
  view: AudienceImportView,
  file: UploadFile,
) {
  ctx.file.current = { ...file, importId: view.importId };
  ctx.setState({ kind: "uploading", view, sent: rowsSent(view) });
  const sent = await uploadChunks({
    missing: view.upload.missingChunks,
    send: chunkSender(ctx.formId, view, file),
    onSent: (index) => markSent(ctx, view, index),
  });
  if (Result.isError(sent) && sent.statusCode !== CONFLICT)
    ctx.setError(sent.message);
  await showLatest(ctx, view, Result.isSuccess(sent) ? sent.value : null);
}

/** A start refused with 409: the form's running import is shown instead, saying why. */
async function openRunning(ctx: RunContext, refused: ResultError) {
  const current = await readImport(ctx.formId, CURRENT_IMPORT);
  if (Result.isError(current)) {
    ctx.setError(refused.message);
    return false;
  }
  ctx.setNotice(ALREADY_RUNNING);
  ctx.setState({ kind: "server", view: current.value });
  return true;
}

/** Starts the import and its upload; false when it did not start and the wizard stays where it is. */
export async function startImport(
  ctx: RunContext,
  request: StartAudienceImportRequest,
  file: UploadFile,
): Promise<boolean> {
  ctx.setError(null);
  ctx.setNotice(null);
  ctx.setPending(true);
  const started = await safely(
    startAudienceImportAction({ formId: ctx.formId, ...request }),
  );
  ctx.setPending(false);
  if (Result.isSuccess(started)) {
    void uploadRows(ctx, started.value, file);
    return true;
  }
  if (started.statusCode === CONFLICT) return openRunning(ctx, started);
  ctx.setError(started.message);
  return false;
}

/** Continues a cut-off upload from a re-chosen file, if it is the same file. */
export async function continueUpload(
  ctx: RunContext,
  view: AudienceImportView,
  picked: Result<UploadFile>,
) {
  const problem = Result.isError(picked)
    ? picked.message
    : sameFileProblem(view, picked.value);
  ctx.setError(problem);
  if (problem || Result.isError(picked)) return;
  ctx.setPending(true);
  const fresh = await readImport(ctx.formId, view.importId);
  ctx.setPending(false);
  const current = Result.isSuccess(fresh) ? fresh.value : view;
  if (current.status !== AudienceImportStatus.Uploading)
    return showView(ctx, current);
  void uploadRows(ctx, current, picked.value);
}

/** Confirms, resumes or cancels; a refusal shows its message and the import as it is now. */
export async function moveImport(
  ctx: RunContext,
  view: AudienceImportView,
  to: AudienceImportMove,
) {
  ctx.setError(null);
  ctx.setPending(true);
  const { formId } = ctx;
  const moved = await safely(
    moveAudienceImportAction({ formId, importId: view.importId, to }),
  );
  const shown = Result.isSuccess(moved)
    ? moved
    : await readImport(formId, view.importId);
  if (Result.isError(moved)) ctx.setError(moved.message);
  if (Result.isSuccess(shown)) showView(ctx, shown.value);
  ctx.setPending(false);
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AudienceImportStatus,
  CURRENT_IMPORT,
  type AudienceImportMove,
  type AudienceImportView,
  type StartAudienceImportRequest,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import {
  getAudienceImportAction,
  moveAudienceImportAction,
  sendAudienceImportChunkAction,
  startAudienceImportAction,
} from "./audience-import.action";
import {
  chunkRowCount,
  importChunk,
  isPolling,
  rowsSent,
  sameFileProblem,
  uploadChunks,
  type UploadFile,
} from "./import-run";

/** How often a checking or writing import is read again while the tab is visible. */
export const POLL_INTERVAL_MS = 2_000;

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

const IDLE: RunState = { kind: "idle" };

async function safely<T>(call: Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await call;
  } catch {
    return Result.error<T>(REJECTED);
  }
}

/** Reads the import every 2 s while the server works on it, skipping while the tab is hidden. */
function usePolling(
  formId: string,
  state: RunState,
  onRead: (view: AudienceImportView) => void,
) {
  const view = state.kind === "server" ? state.view : null;
  const importId = view?.importId;
  const polling = view !== null && isPolling(view.status);
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;
  useEffect(() => {
    if (!polling || !importId) return;
    let reading = false;
    const read = async () => {
      if (reading || document.visibilityState === "hidden") return;
      reading = true;
      const result = await safely(getAudienceImportAction({ formId, importId }));
      reading = false;
      if (Result.isSuccess(result)) onReadRef.current(result.value);
    };
    const timer = setInterval(read, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", read);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", read);
    };
  }, [formId, importId, polling]);
}

/** Opens on the form's unfinished import, if it has one (B5). */
function useCurrentImport(formId: string, onFound: (view: AudienceImportView) => void) {
  const onFoundRef = useRef(onFound);
  onFoundRef.current = onFound;
  useEffect(() => {
    let live = true;
    void safely(getAudienceImportAction({ formId, importId: CURRENT_IMPORT })).then(
      (read) => {
        if (live && Result.isSuccess(read)) onFoundRef.current(read.value);
      },
    );
    return () => {
      live = false;
    };
  }, [formId]);
}

/** Refreshes the People list once a write completes, whether or not the panel is open. */
function useRefreshOnComplete(state: RunState) {
  const router = useRouter();
  const status = state.kind === "server" ? state.view.status : null;
  useEffect(() => {
    if (status === AudienceImportStatus.Completed) router.refresh();
  }, [status, router]);
}

/**
 * The form's staged import: start it, send the file in chunks, follow the Check and the write,
 * confirm, cancel or resume. `onFound` runs when the form already has an unfinished import.
 */
export function useAudienceImport(
  formId: string,
  { onFound }: { onFound: () => void },
) {
  const [state, setState] = useState<RunState>(IDLE);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** The rows this tab can send for an import, so a failed upload can be sent again. */
  const file = useRef<(UploadFile & { importId: string }) | null>(null);

  /** Shows a view of the import on screen, never one of another import. */
  const show = (view: AudienceImportView) =>
    setState((current) =>
      current.kind !== "idle" && current.view.importId !== view.importId
        ? current
        : { kind: "server", view },
    );
  const read = (importId: string) =>
    safely(getAudienceImportAction({ formId, importId }));

  useCurrentImport(formId, (view) => {
    setState((current) => (current.kind === "idle" ? { kind: "server", view } : current));
    onFound();
  });
  usePolling(formId, state, show);
  useRefreshOnComplete(state);

  const markSent = (importId: string, rows: number) =>
    setState((current) =>
      current.kind === "uploading" && current.view.importId === importId
        ? { ...current, sent: current.sent + rows }
        : current,
    );

  const upload = async (view: AudienceImportView, rows: UploadFile) => {
    const { importId, upload: shape } = view;
    file.current = { ...rows, importId };
    setState({ kind: "uploading", view, sent: rowsSent(view) });
    const sent = await uploadChunks({
      missing: shape.missingChunks,
      send: (index) =>
        safely(
          sendAudienceImportChunkAction({
            formId,
            importId,
            index,
            chunk: importChunk(rows.rows, {
              index,
              chunkSize: shape.chunkSize,
              columns: rows.headers.length,
            }),
          }),
        ),
      onSent: (index) => markSent(importId, chunkRowCount(shape, index)),
    });
    if (Result.isError(sent) && sent.statusCode !== CONFLICT) setError(sent.message);
    const moved = Result.isSuccess(sent) ? sent.value : null;
    if (moved && moved.status !== AudienceImportStatus.Uploading) return show(moved);
    const fresh = await read(importId);
    show(Result.isSuccess(fresh) ? fresh.value : view);
  };

  const start = async (
    request: StartAudienceImportRequest,
    rows: UploadFile,
  ): Promise<boolean> => {
    setError(null);
    setNotice(null);
    setPending(true);
    const started = await safely(startAudienceImportAction({ formId, ...request }));
    if (Result.isSuccess(started)) {
      setPending(false);
      void upload(started.value, rows);
      return true;
    }
    const current =
      started.statusCode === CONFLICT ? await read(CURRENT_IMPORT) : null;
    setPending(false);
    if (!current || Result.isError(current)) {
      setError(started.message);
      return false;
    }
    setNotice(ALREADY_RUNNING);
    show(current.value);
    return true;
  };

  /** Continues a cut-off upload from a re-chosen file, if it is the same file. */
  const continueWith = async (picked: Result<UploadFile>) => {
    if (state.kind !== "server") return;
    const problem = Result.isError(picked)
      ? picked.message
      : sameFileProblem(state.view, picked.value);
    setError(problem);
    if (problem || Result.isError(picked)) return;
    const rows = picked.value;
    const fresh = await read(state.view.importId);
    const view = Result.isSuccess(fresh) ? fresh.value : state.view;
    if (view.status !== AudienceImportStatus.Uploading) return show(view);
    void upload(view, rows);
  };

  const canSendAgain =
    state.kind === "server" &&
    state.view.status === AudienceImportStatus.Uploading &&
    file.current?.importId === state.view.importId;

  const sendAgain = () => {
    if (!canSendAgain || !file.current) return;
    setError(null);
    void continueWith(Result.success(file.current));
  };

  const move = async (to: AudienceImportMove) => {
    if (state.kind === "idle") return;
    const { importId } = state.view;
    setError(null);
    setPending(true);
    const moved = await safely(moveAudienceImportAction({ formId, importId, to }));
    if (Result.isError(moved)) {
      setError(moved.message);
      const fresh = await read(importId);
      if (Result.isSuccess(fresh)) show(fresh.value);
    } else {
      show(moved.value);
    }
    setPending(false);
  };

  const dismiss = () => {
    file.current = null;
    setState(IDLE);
    setError(null);
    setNotice(null);
  };

  return {
    state,
    error,
    notice,
    pending,
    canSendAgain,
    start,
    continueWith,
    sendAgain,
    confirm: () => move(AudienceImportStatus.Writing),
    resume: () => move(AudienceImportStatus.Writing),
    cancel: () => move(AudienceImportStatus.Canceled),
    dismiss,
  };
}

export type AudienceImportRun = ReturnType<typeof useAudienceImport>;

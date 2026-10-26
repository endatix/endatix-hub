"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AudienceImportStatus,
  CURRENT_IMPORT,
  type AudienceImportView,
  type StartAudienceImportRequest,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { isPolling, type UploadFile } from "./import-run";
import {
  continueUpload,
  moveImport,
  readImport,
  showView,
  startImport,
  type HeldFile,
  type RunContext,
  type RunState,
} from "./import-run-steps";

export type { RunState } from "./import-run-steps";

/** How often a checking or writing import is read again while the tab is visible. */
export const POLL_INTERVAL_MS = 2_000;

const IDLE: RunState = { kind: "idle" };

/** Runs `read` every `ms` and when the tab shows again; never while hidden or while one is running. */
function everyWhileVisible(read: () => Promise<void>, ms: number): () => void {
  let busy = false;
  const tick = async () => {
    if (busy || document.visibilityState === "hidden") return;
    busy = true;
    await read().finally(() => (busy = false));
  };
  const timer = setInterval(tick, ms);
  document.addEventListener("visibilitychange", tick);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", tick);
  };
}

/** The latest callback, for an effect that must not restart when it changes. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/** Reads the import every 2 s while the server works on it (Check or write), paused while hidden. */
function usePolling(
  formId: string,
  state: RunState,
  onRead: (view: AudienceImportView) => void,
) {
  const view = state.kind === "server" ? state.view : null;
  const importId = view && isPolling(view.status) ? view.importId : null;
  const onReadRef = useLatest(onRead);
  useEffect(() => {
    if (!importId) return;
    return everyWhileVisible(async () => {
      const read = await readImport(formId, importId);
      if (Result.isSuccess(read)) onReadRef.current(read.value);
    }, POLL_INTERVAL_MS);
  }, [formId, importId, onReadRef]);
}

/** Opens on the form's unfinished import, if it has one (B5). */
function useCurrentImport(
  formId: string,
  onFound: (view: AudienceImportView) => void,
) {
  const onFoundRef = useLatest(onFound);
  useEffect(() => {
    let live = true;
    void readImport(formId, CURRENT_IMPORT).then((read) => {
      if (live && Result.isSuccess(read)) onFoundRef.current(read.value);
    });
    return () => {
      live = false;
    };
  }, [formId, onFoundRef]);
}

/** Refreshes the People list once a write completes, whether or not the panel is open. */
function useRefreshOnComplete(state: RunState) {
  const router = useRouter();
  const status = state.kind === "server" ? state.view.status : null;
  useEffect(() => {
    if (status === AudienceImportStatus.Completed) router.refresh();
  }, [status, router]);
}

/** The import's state and the context the run steps act on. */
function useRunContext(formId: string) {
  const [state, setState] = useState<RunState>(IDLE);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const file = useRef<HeldFile | null>(null);
  const ctx: RunContext = {
    formId,
    setState,
    setError,
    setNotice,
    setPending,
    file,
  };
  return { state, error, notice, pending, ctx };
}

/** Back to no import: the outcome was read, or a failed start is left behind. */
function dismissRun(ctx: RunContext) {
  ctx.file.current = null;
  ctx.setError(null);
  ctx.setNotice(null);
  ctx.setState(IDLE);
}

/** A failed upload this tab still holds the rows for. */
function canSendAgainOf(state: RunState, file: HeldFile | null): boolean {
  return (
    state.kind === "server" &&
    state.view.status === AudienceImportStatus.Uploading &&
    file?.importId === state.view.importId
  );
}

function runActions(ctx: RunContext, state: RunState) {
  const view = state.kind === "idle" ? null : state.view;
  const continueWith = async (picked: Result<UploadFile>) => {
    if (state.kind === "server") await continueUpload(ctx, state.view, picked);
  };
  const move = (to: Parameters<typeof moveImport>[2]) => async () => {
    if (view) await moveImport(ctx, view, to);
  };
  return {
    start: (request: StartAudienceImportRequest, file: UploadFile) =>
      startImport(ctx, request, file),
    continueWith,
    sendAgain: () =>
      ctx.file.current && continueWith(Result.success(ctx.file.current)),
    confirm: move(AudienceImportStatus.Writing),
    resume: move(AudienceImportStatus.Writing),
    cancel: move(AudienceImportStatus.Canceled),
    dismiss: () => dismissRun(ctx),
  };
}

/**
 * The form's staged import: start it, send the file in chunks, follow the Check and the write,
 * confirm, cancel or resume. `onFound` runs when the form already has an unfinished import.
 */
export function useAudienceImport(
  formId: string,
  { onFound }: { onFound: () => void },
) {
  const { state, ctx, ...flags } = useRunContext(formId);
  useCurrentImport(formId, (view) => {
    ctx.setState((current) =>
      current.kind === "idle" ? { kind: "server", view } : current,
    );
    onFound();
  });
  usePolling(formId, state, (view) => showView(ctx, view));
  useRefreshOnComplete(state);
  const canSendAgain = canSendAgainOf(state, ctx.file.current);
  return { state, ...flags, canSendAgain, ...runActions(ctx, state) };
}

export type AudienceImportRun = ReturnType<typeof useAudienceImport>;

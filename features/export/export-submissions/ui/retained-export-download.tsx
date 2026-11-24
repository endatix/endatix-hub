"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initiateFileDownload } from "@/lib/utils/files-download";
import { getExportFailureMessage } from "../../export-error-message";
import {
  receiveRetainedAttachment,
  RetainedExportRefused,
  type AttachmentSelection,
} from "../retained-attachment";
import { SupportReference } from "./support-reference";

type Download =
  | { kind: "idle" | "preparing" | "noRows" }
  | { kind: "saved"; filename: string }
  | { kind: "failed"; message: string; traceId?: string };

function outcomeOf(error: unknown): Download {
  if (!(error instanceof RetainedExportRefused))
    return { kind: "failed", message: getExportFailureMessage(error) };
  const { noEligibleRows, message, traceId } = error.problem;
  return noEligibleRows
    ? { kind: "noRows" }
    : { kind: "failed", message, traceId };
}

/** Fetches and checks the complete attachment, then saves it in the same click. */
async function fetchAndSave(
  selection: AttachmentSelection,
  signal: AbortSignal,
): Promise<Download> {
  try {
    const file = await receiveRetainedAttachment(selection, signal);
    signal.throwIfAborted();
    initiateFileDownload(file.blob, file.filename);
    return { kind: "saved", filename: file.filename };
  } catch (error) {
    return outcomeOf(error);
  }
}

function useRetainedDownload(selection: AttachmentSelection | null) {
  const [state, setState] = useState<Download>({ kind: "idle" });
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function download() {
    if (pending.current || !selection) return;
    const controller = new AbortController();
    pending.current = controller;
    setState({ kind: "preparing" });
    const next = await fetchAndSave(selection, controller.signal);
    if (!controller.signal.aborted) setState(next);
    pending.current = null;
  }
  return { state, download };
}

function Line({
  icon,
  children,
}: Readonly<{ icon: ReactNode; children: ReactNode }>) {
  return (
    <div className="flex items-start gap-2 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0">
      {icon}
      <div className="grid gap-1">{children}</div>
    </div>
  );
}

function DownloadOutcome({ state }: Readonly<{ state: Download }>) {
  if (state.kind === "noRows")
    return (
      <Line icon={<Info className="text-info" />}>
        No completed submissions match these filters. Change the filters below
        or wait for completed submissions.
      </Line>
    );
  if (state.kind === "failed")
    return (
      <Line icon={<CircleAlert className="text-destructive" />}>
        <p className="font-medium text-destructive">
          The previous export could not be downloaded
        </p>
        <p>{state.message}</p>
        <SupportReference traceId={state.traceId} />
      </Line>
    );
  if (state.kind === "saved")
    return (
      <Line icon={<CheckCircle2 className="text-success" />}>
        {state.filename} is in your browser&apos;s downloads.
      </Line>
    );
  return null;
}

/** The retained-conflict recovery option. Key it by the selection's URL so a format or filter change starts over. */
export function RetainedExportDownload({
  selection,
}: Readonly<{ selection: AttachmentSelection | null }>) {
  const { state, download } = useRetainedDownload(selection);
  const busy = state.kind === "preparing";
  return (
    <div className="grid justify-items-start gap-2" aria-live="polite">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={download}
        disabled={busy || !selection}
      >
        {busy ? "Preparing file…" : "Download with previous schema"}
      </Button>
      <Line icon={<TriangleAlert className="text-warning" />}>
        Recent changes to the form are not included. The file uses the format
        and filters selected below.
      </Line>
      <DownloadOutcome state={state} />
    </div>
  );
}

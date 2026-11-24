"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { initiateFileDownload } from "@/lib/utils/files-download";
import { getExportFailureMessage } from "../../export-error-message";
import {
  receiveRetainedAttachment,
  type AttachmentSelection,
  type ReceivedAttachment,
} from "../retained-attachment";

type Check =
  | { kind: "idle" | "checking" }
  | { kind: "failed"; message: string }
  | { kind: "received"; file: ReceivedAttachment };

function useAttachmentCheck(selection: AttachmentSelection) {
  const [state, setState] = useState<Check>({ kind: "idle" });
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function check() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setState({ kind: "checking" });
    const next = await checkAttachment(selection, controller.signal);
    if (!controller.signal.aborted) setState(next);
    pending.current = null;
  }
  return { state, check };
}

async function checkAttachment(
  selection: AttachmentSelection,
  signal: AbortSignal,
): Promise<Check> {
  try {
    return {
      kind: "received",
      file: await receiveRetainedAttachment(selection, signal),
    };
  } catch (error) {
    return { kind: "failed", message: getExportFailureMessage(error) };
  }
}

/** Mounted only for a retained-schema conflict; its URL key owns one in-memory file. */
export function RetainedExportCheck({
  selection,
}: Readonly<{ selection: AttachmentSelection }>) {
  const { state, check } = useAttachmentCheck(selection);
  if (state.kind === "received") return <SavedExport file={state.file} />;
  const busy = state.kind === "checking";
  return (
    <div className="space-y-2" aria-live="polite">
      {state.kind === "failed" && <p role="alert">{state.message}</p>}
      <Button type="button" variant="outline" onClick={check} disabled={busy}>
        {busy ? "Checking previous export…" : "Check previous export"}
      </Button>
    </div>
  );
}

function SavedExport({ file }: Readonly<{ file: ReceivedAttachment }>) {
  const save = () => initiateFileDownload(file.blob, file.filename);
  return (
    <div className="space-y-2">
      <p>Recent changes may be missing from this file.</p>
      <Button type="button" variant="outline" onClick={save}>
        Download using previous schema
      </Button>
    </div>
  );
}

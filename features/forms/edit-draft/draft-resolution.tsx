"use client";

import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { DraftAutosave, DraftView } from "@/lib/survey-features/draft-autosave/controller";

const resolutions = {
  recovery: {
    title: "Unsaved changes found on this device",
    description: "This device has changes that haven’t reached the server. Restore them or use the server copy.",
    discard: "Use the server copy", keep: "Restore my changes",
  },
  conflict: {
    title: "This form changed elsewhere",
    description: "Load the server version to discard your local changes, or keep your changes as the latest draft.",
    discard: "Load server version", keep: "Keep mine",
  },
};
type Resolution = typeof resolutions.recovery;

function ResolutionActions({ controller, copy }: { controller: DraftAutosave; copy: Resolution }) {
  const [busy, setBusy] = useState(false);
  const choose = async (keep: boolean) => {
    setBusy(true);
    try { await controller.resolve(keep); }
    finally { setBusy(false); }
  };
  return <DialogFooter>
    <Button disabled={busy} variant="outline" onClick={() => void choose(false)}>{copy.discard}</Button>
    <Button disabled={busy} onClick={() => void choose(true)}>{copy.keep}</Button>
  </DialogFooter>;
}

export function DraftResolution({ controller, view }: { controller: DraftAutosave; view: DraftView }) {
  if (view.status !== "recovery" && view.status !== "conflict") return null;
  const copy = resolutions[view.status];
  const user = view.head.lastModifiedBy?.userId;
  const saver = user ? `user ${user}` : "another editor";
  return <Dialog open>
    <DialogContent showCloseButton={false}>
      <DialogTitle>{copy.title}</DialogTitle>
      <DialogDescription>{view.message ?? copy.description}</DialogDescription>
      {controller.serverMoved && <p>Restoring saves your copy over the version saved by {saver}. Their save stays in the draft history.</p>}
      <ResolutionActions controller={controller} copy={copy} />
    </DialogContent>
  </Dialog>;
}

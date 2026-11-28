"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type {
  DraftAutosave,
  DraftView,
} from "@/lib/survey-features/draft-autosave/controller";

export function DraftResolution({
  controller,
  view,
}: {
  controller: DraftAutosave;
  view: DraftView;
}) {
  const [busy, setBusy] = useState(false);
  const recovery = view.status === "recovery";
  const resolve = async (keep: boolean) => {
    setBusy(true);
    try {
      await controller.resolve(keep);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={recovery || view.status === "conflict"}>
      <DialogContent showCloseButton={false}>
        <DialogTitle>
          {recovery
            ? "Unsaved changes found on this device"
            : "This form changed elsewhere"}
        </DialogTitle>
        <DialogDescription>
          {view.message ??
            (recovery
              ? "This device has changes that haven’t reached the server. Restore them or use the server copy."
              : "Load the server version to discard your local changes, or keep your changes as the latest draft.")}
        </DialogDescription>
        {controller.serverMoved && (
          <p>
            Restoring saves your copy over the version saved by{" "}
            {view.head.lastModifiedBy?.userId
              ? `user ${view.head.lastModifiedBy.userId}`
              : "another editor"}
            . Their save stays in the draft history.
          </p>
        )}
        <DialogFooter>
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => void resolve(false)}
          >
            {recovery ? "Use the server copy" : "Load server version"}
          </Button>
          <Button disabled={busy} onClick={() => void resolve(true)}>
            {recovery ? "Restore my changes" : "Keep mine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/loaders/spinner";
import type { RefObject } from "react";
import type { ExportDialogPhase } from "../export-dialog-phase";

interface ExportDialogActionsProps {
  phase: ExportDialogPhase;
  busy: boolean;
  isExporting: boolean;
  showPrepareCta: boolean;
  canExport: boolean;
  exportButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onCancel: () => void;
  onPrepare: () => void;
}

export function ExportDialogActions({
  phase,
  busy,
  isExporting,
  showPrepareCta,
  canExport,
  exportButtonRef,
  onClose,
  onCancel,
  onPrepare,
}: Readonly<ExportDialogActionsProps>) {
  return (
    <DialogFooter className="gap-2 sm:gap-2">
      {phase === "success" ? (
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          {showPrepareCta ? (
            <Button type="button" onClick={onPrepare} disabled={busy}>
              {phase === "preparing" ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Preparing...
                </>
              ) : (
                "Prepare for export"
              )}
            </Button>
          ) : (
            <Button
              ref={exportButtonRef}
              type="submit"
              disabled={busy || !canExport || phase === "checking"}
            >
              {phase === "exporting" || isExporting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Exporting...
                </>
              ) : (
                "Export"
              )}
            </Button>
          )}
        </>
      )}
    </DialogFooter>
  );
}

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
  showExportSubmit: boolean;
  showBackToExport: boolean;
  canExport: boolean;
  exportButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onCancel: () => void;
  onBackToExport: () => void;
  onPrepare: () => void;
}

function PrimaryActionButton({
  phase,
  busy,
  isExporting,
  showPrepareCta,
  showExportSubmit,
  canExport,
  exportButtonRef,
  onPrepare,
}: Readonly<
  Pick<
    ExportDialogActionsProps,
    | "phase"
    | "busy"
    | "isExporting"
    | "showPrepareCta"
    | "showExportSubmit"
    | "canExport"
    | "exportButtonRef"
    | "onPrepare"
  >
>) {
  if (showPrepareCta) {
    const isPreparing = phase === "preparing";
    return (
      <Button type="button" onClick={onPrepare} disabled={busy}>
        {isPreparing ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Preparing...
          </>
        ) : (
          "Prepare for export"
        )}
      </Button>
    );
  }

  if (!showExportSubmit) {
    return null;
  }

  const isSubmitting = phase === "exporting" || isExporting;
  return (
    <Button
      ref={exportButtonRef}
      type="submit"
      disabled={busy || !canExport || phase === "checking"}
    >
      {isSubmitting ? (
        <>
          <Spinner className="mr-2 h-4 w-4" />
          Exporting...
        </>
      ) : (
        "Export"
      )}
    </Button>
  );
}

export function ExportDialogActions({
  phase,
  busy,
  isExporting,
  showPrepareCta,
  showExportSubmit,
  showBackToExport,
  canExport,
  exportButtonRef,
  onClose,
  onCancel,
  onBackToExport,
  onPrepare,
}: Readonly<ExportDialogActionsProps>) {
  if (phase === "success") {
    return (
      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    );
  }

  return (
    <DialogFooter className="gap-2 sm:gap-2">
      {showBackToExport ? (
        <Button
          type="button"
          variant="outline"
          onClick={onBackToExport}
          disabled={busy}
        >
          Back to export
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
      )}
      <PrimaryActionButton
        phase={phase}
        busy={busy}
        isExporting={isExporting}
        showPrepareCta={showPrepareCta}
        showExportSubmit={showExportSubmit}
        canExport={canExport}
        exportButtonRef={exportButtonRef}
        onPrepare={onPrepare}
      />
    </DialogFooter>
  );
}

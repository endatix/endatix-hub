"use client";

import { Button } from "@/components/ui/button";
import { ResponsivePanelFooter } from "@/components/ui/responsive-panel";
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
  includingIncomplete: boolean;
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
  includingIncomplete,
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
    | "includingIncomplete"
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
            Preparing…
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
  // The button names the stage that is running; the header says the rest.
  const submitLabel = includingIncomplete
    ? "Updating submissions…"
    : "Exporting…";

  return (
    <Button
      ref={exportButtonRef}
      type="submit"
      disabled={busy || !canExport || phase === "checking"}
    >
      {isSubmitting ? (
        <>
          <Spinner className="mr-2 h-4 w-4" />
          {submitLabel}
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
  includingIncomplete,
  exportButtonRef,
  onClose,
  onCancel,
  onBackToExport,
  onPrepare,
}: Readonly<ExportDialogActionsProps>) {
  if (phase === "success") {
    return (
      <ResponsivePanelFooter className="gap-2 sm:gap-2">
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </ResponsivePanelFooter>
    );
  }

  return (
    <ResponsivePanelFooter className="gap-2 sm:gap-2">
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
        includingIncomplete={includingIncomplete}
        exportButtonRef={exportButtonRef}
        onPrepare={onPrepare}
      />
    </ResponsivePanelFooter>
  );
}

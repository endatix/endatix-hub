import { isExportPrepareRecoveryError } from "../export-error-message";

export type ExportDialogPhase =
  | "checking"
  | "needsPrepare"
  | "ready"
  | "preparing"
  | "exporting"
  | "success"
  | "error";

export function isBusyPhase(phase: ExportDialogPhase): boolean {
  return phase === "preparing" || phase === "exporting";
}

export function isControlsLocked(phase: ExportDialogPhase): boolean {
  return (
    phase === "checking" ||
    phase === "preparing" ||
    phase === "exporting" ||
    phase === "success"
  );
}

export function showsFiltersForm(phase: ExportDialogPhase): boolean {
  return phase === "ready" || phase === "error" || phase === "exporting";
}

export function showsPrepareCta(
  phase: ExportDialogPhase,
  inlineError: string | null,
): boolean {
  return (
    phase === "preparing" ||
    phase === "needsPrepare" ||
    (phase === "error" &&
      inlineError != null &&
      isExportPrepareRecoveryError(inlineError))
  );
}

export function showsPrepareOptions(
  phase: ExportDialogPhase,
  rebuildMode: boolean,
): boolean {
  // Stays mounted, locked, while preparing so the panel does not jump.
  return (
    rebuildMode &&
    (phase === "needsPrepare" || phase === "preparing" || phase === "error")
  );
}

export function showsRebuildEntry(phase: ExportDialogPhase): boolean {
  return phase === "ready";
}

export function getPhaseDescription(
  phase: ExportDialogPhase,
  options: { rebuildMode?: boolean; includingIncomplete?: boolean } = {},
): string {
  switch (phase) {
    case "checking":
      return "Checking whether this form is ready for export…";
    case "needsPrepare":
      return options.rebuildMode
        ? "Rebuild the reporting data for this form, then return to export."
        : "This form needs a one-time prepare step before you can export.";
    case "preparing":
      return "Preparing reporting data. This can take a moment.";
    case "exporting":
      return options.includingIncomplete
        ? "Updating incomplete submissions, then generating your file…"
        : "Generating your file…";
    case "success":
      return "Your file is in your browser's downloads.";
    default:
      return "Choose a file format and which submissions to include.";
  }
}

export type PrepareOutcome = {
  summary: string;
  failed: number;
};

/** Counts the reader can act on; batches are bookkeeping and stay out. */
export function formatPrepareOutcome(result: {
  processed: number;
  skipped: number;
  failed: number;
}): PrepareOutcome {
  const counts = `${result.processed} processed, ${result.skipped} skipped, ${result.failed} failed.`;
  const summary =
    result.failed > 0
      ? `${counts} Failed submissions are missing from the export until a rebuild succeeds.`
      : `${counts} You can export now.`;
  return { summary, failed: result.failed };
}

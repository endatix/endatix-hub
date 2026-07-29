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
  return rebuildMode && (phase === "needsPrepare" || phase === "error");
}

export function showsRebuildEntry(phase: ExportDialogPhase): boolean {
  return phase === "ready";
}

export function getPhaseDescription(
  phase: ExportDialogPhase,
  options: { rebuildMode?: boolean } = {},
): string {
  switch (phase) {
    case "checking":
      return "Checking whether this form is ready for reporting export…";
    case "needsPrepare":
      return options.rebuildMode
        ? "Rebuild the reporting schema and flattened submissions, then return to export."
        : "This form needs a one-time prepare step before you can export.";
    case "preparing":
      return "Compiling the export schema and backfilling submissions. This can take a moment.";
    case "exporting":
      return "Generating your file…";
    case "success":
      return "Your file has been downloaded.";
    default:
      return "Choose a format and filters. Date ranges are prefilled from the table when set. Press Enter to export with the current options.";
  }
}

export function formatPrepareSuccessSummary(summary: {
  processed: number;
  skipped: number;
  failed: number;
  batches: number;
}): string {
  const batchLabel = summary.batches === 1 ? "batch" : "batches";
  return `Schema compiled. Backfill finished: ${summary.processed} processed, ${summary.skipped} skipped, ${summary.failed} failed (${summary.batches} ${batchLabel}). You can export now.`;
}

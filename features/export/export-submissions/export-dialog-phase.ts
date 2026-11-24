import { Result } from "@/lib/result";
import { DEFAULT_REPORTING_LOCALE } from "../export-url";
import {
  GENERIC_EXPORT_FAILURE_MESSAGE,
  SCHEMA_NEEDS_PREPARE_MESSAGE,
  isExportSchemaMissingError,
  isExportPrepareRecoveryError,
} from "../export-error-message";

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

interface ControlState {
  readinessPassed: boolean;
  rebuildMode: boolean;
  canRebuild: boolean;
  exportPermitted: boolean;
  hasFailure: boolean;
  inlineError: string | null;
}

export function exportDialogControls(
  phase: ExportDialogPhase,
  state: ControlState,
) {
  const { rebuildMode, readinessPassed, inlineError } = state;
  const retry = phase === "error" && (rebuildMode || state.hasFailure);
  const prepare = retry || showsPrepareCta(phase, inlineError);
  return {
    showFiltersForm: state.exportPermitted && showsFiltersForm(phase),
    showPrepareCta: prepare,
    showPrepareOptions: showsPrepareOptions(phase, rebuildMode),
    showRebuildEntry: state.canRebuild && showsRebuildEntry(phase),
    showBackToExport:
      readinessPassed &&
      showsPrepareOptions(phase, rebuildMode) &&
      !isBusyPhase(phase),
    showExportSubmit: readinessPassed && !prepare && !rebuildMode,
  };
}

export function schemaReadiness(result: Result<string[]>) {
  if (Result.isSuccess(result))
    return { phase: "ready" as const, locales: result.value, message: null };
  const locales = [DEFAULT_REPORTING_LOCALE];
  if (isExportSchemaMissingError(result.message))
    return {
      phase: "needsPrepare" as const,
      locales,
      message: SCHEMA_NEEDS_PREPARE_MESSAGE,
    };
  return {
    phase: "error" as const,
    locales,
    message: result.message || GENERIC_EXPORT_FAILURE_MESSAGE,
  };
}

/** The footer's primary action. Under any error it names the fix, never the first-time prepare. */
export function prepareActionLabel(
  phase: ExportDialogPhase,
  failure: { previousSchema?: "retained" } | null,
  fullRecompile: boolean,
): string {
  if (phase !== "error") return "Prepare for export";
  if (!failure) return "Try again";
  if (fullRecompile) return "Run full recompile";
  return failure.previousSchema === "retained"
    ? "Rebuild again"
    : "Retry rebuild";
}

"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/loaders/spinner";
import { SCHEMA_NEEDS_PREPARE_MESSAGE } from "../../export-error-message";
import { CheckCircle2 } from "lucide-react";
import type { ExportCompletionStatusFilter } from "../../export-url";
import { EXPORT_COMPLETION_STATUS } from "../../export-url";
import type { ExportDialogPhase } from "../export-dialog-phase";

const REBUILD_PREPARE_MESSAGE =
  "Rebuild the reporting schema and flattened submissions, then return to export.";

interface ExportDialogStatusPanelProps {
  phase: ExportDialogPhase;
  rebuildMode?: boolean;
  inlineError: string | null;
  prepareSuccessSummary: string | null;
  completionStatus?: ExportCompletionStatusFilter;
  includingIncomplete?: boolean;
}

export function ExportDialogStatusPanel({
  phase,
  rebuildMode = false,
  inlineError,
  prepareSuccessSummary,
  completionStatus,
  includingIncomplete = false,
}: Readonly<ExportDialogStatusPanelProps>) {
  let prepareAlertTitle = "Prepare required";
  if (phase === "error") {
    prepareAlertTitle = "Export failed";
  } else if (rebuildMode) {
    prepareAlertTitle = "Rebuild reporting data";
  }

  let prepareAlertDescription = SCHEMA_NEEDS_PREPARE_MESSAGE;
  if (inlineError) {
    prepareAlertDescription = inlineError;
  } else if (rebuildMode) {
    prepareAlertDescription = REBUILD_PREPARE_MESSAGE;
  }

  const includesIncompleteRows =
    completionStatus === EXPORT_COMPLETION_STATUS.incomplete ||
    completionStatus === EXPORT_COMPLETION_STATUS.all;
  const showIncompleteNotice =
    phase === "ready" &&
    includesIncompleteRows &&
    !prepareSuccessSummary &&
    !includingIncomplete;

  return (
    <>
      {includingIncomplete ? (
        <p className="text-sm text-muted-foreground" role="status">
          Including incomplete responses…
        </p>
      ) : null}

      {phase === "checking" ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" />
          Checking export readiness…
        </div>
      ) : null}

      {phase === "success" ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="size-10 text-success" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Export completed successfully.
          </p>
        </div>
      ) : null}

      {phase === "needsPrepare" || phase === "error" ? (
        <Alert variant={phase === "error" ? "destructive" : "info"}>
          <AlertTitle>{prepareAlertTitle}</AlertTitle>
          <AlertDescription>{prepareAlertDescription}</AlertDescription>
        </Alert>
      ) : null}

      {phase === "ready" && prepareSuccessSummary ? (
        <Alert variant="success">
          <CheckCircle2 />
          <AlertTitle>Ready to export</AlertTitle>
          <AlertDescription>{prepareSuccessSummary}</AlertDescription>
        </Alert>
      ) : null}

      {showIncompleteNotice ? (
        <Alert variant="info">
          <AlertTitle>Incomplete responses are included</AlertTitle>
          <AlertDescription>
            Endatix updates them before the download.
          </AlertDescription>
        </Alert>
      ) : null}

      {phase === "preparing" ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" />
          Preparing schema and backfilling submissions…
        </div>
      ) : null}
    </>
  );
}

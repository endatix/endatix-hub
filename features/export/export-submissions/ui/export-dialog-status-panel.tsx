"use client";

import { PanelSection } from "@/components/common/panel-section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SCHEMA_NEEDS_PREPARE_MESSAGE } from "../../export-error-message";
import {
  CheckCircle2,
  FileDown,
  ListFilter,
  TriangleAlert,
} from "lucide-react";
import type { ExportDialogPhase, PrepareOutcome } from "../export-dialog-phase";
import type { IncompleteRefreshOutcome } from "../refresh-incomplete-submissions.action";

const REBUILD_PREPARE_MESSAGE =
  "Updates the reporting schema and processes submissions that are missing from the reporting data.";

interface ExportDialogStatusPanelProps {
  phase: ExportDialogPhase;
  rebuildMode?: boolean;
  inlineError: string | null;
  prepareOutcome: PrepareOutcome | null;
  incompleteRefresh?: IncompleteRefreshOutcome | null;
  exportName?: string;
}

/** Extra sentence on the success strip. `partial` means some drafts may be missing. */
function describeIncompleteRefresh(
  refresh: IncompleteRefreshOutcome | null | undefined,
): { text: string; partial: boolean } | null {
  if (!refresh) {
    return null;
  }

  if (refresh.kind === "skipped") {
    return {
      text: "Incomplete submissions are as of their last update: bringing them up to date needs permission to edit this form.",
      partial: false,
    };
  }

  if (refresh.failed > 0) {
    const noun = refresh.failed === 1 ? "submission" : "submissions";
    return {
      text: `${refresh.failed} incomplete ${noun} could not be updated and may be missing or out of date.`,
      partial: true,
    };
  }

  if (!refresh.finished) {
    return {
      text: "There were too many incomplete submissions to update in one export; some may be missing or out of date.",
      partial: true,
    };
  }

  return null;
}

/** One strip for the current step. Progress stays in the header and footer. */
export function ExportDialogStatusPanel({
  phase,
  rebuildMode = false,
  inlineError,
  prepareOutcome,
  incompleteRefresh,
  exportName,
}: Readonly<ExportDialogStatusPanelProps>) {
  if (phase === "checking") {
    return <ExportDialogSkeleton />;
  }

  if (phase === "success") {
    return (
      <DownloadOutcomeAlert
        exportName={exportName}
        incompleteRefresh={incompleteRefresh}
      />
    );
  }

  if (phase === "needsPrepare" || phase === "preparing" || phase === "error") {
    return (
      <PrepareOrErrorAlert
        phase={phase}
        rebuildMode={rebuildMode}
        inlineError={inlineError}
      />
    );
  }

  if (phase === "ready" && prepareOutcome) {
    return <PrepareOutcomeAlert outcome={prepareOutcome} />;
  }

  return null;
}

function DownloadOutcomeAlert({
  exportName,
  incompleteRefresh,
}: Readonly<
  Pick<ExportDialogStatusPanelProps, "exportName" | "incompleteRefresh">
>) {
  const title = exportName
    ? `${exportName} file downloaded`
    : "File downloaded";
  const refreshNote = describeIncompleteRefresh(incompleteRefresh);
  const partial = refreshNote?.partial === true;

  return (
    <Alert variant={partial ? "warning" : "success"}>
      {partial ? <TriangleAlert /> : <CheckCircle2 />}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        Find it in your browser&apos;s downloads.
        {refreshNote ? ` ${refreshNote.text}` : null}
      </AlertDescription>
    </Alert>
  );
}

function PrepareOrErrorAlert({
  phase,
  rebuildMode,
  inlineError,
}: Readonly<
  Pick<ExportDialogStatusPanelProps, "phase" | "rebuildMode" | "inlineError">
>) {
  const title = prepareOrErrorTitle(phase, rebuildMode);
  const description =
    inlineError ??
    (rebuildMode ? REBUILD_PREPARE_MESSAGE : SCHEMA_NEEDS_PREPARE_MESSAGE);

  return (
    <Alert variant={phase === "error" ? "destructive" : "info"}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}

function prepareOrErrorTitle(
  phase: ExportDialogPhase,
  rebuildMode: boolean | undefined,
): string {
  if (phase === "error") {
    return "Export failed";
  }
  if (rebuildMode) {
    return "Rebuild reporting data";
  }
  return "Prepare required";
}

function PrepareOutcomeAlert({
  outcome,
}: Readonly<{ outcome: PrepareOutcome }>) {
  const hasFailures = outcome.failed > 0;

  return (
    <Alert variant={hasFailures ? "warning" : "success"}>
      {hasFailures ? <TriangleAlert /> : <CheckCircle2 />}
      <AlertTitle>
        {hasFailures ? "Ready, with failed submissions" : "Ready to export"}
      </AlertTitle>
      <AlertDescription>{outcome.summary}</AlertDescription>
    </Alert>
  );
}

/** The form's sections with their bodies still loading. */
function ExportDialogSkeleton() {
  const bar = "bg-foreground/10";
  return (
    <div aria-busy="true" className="grid gap-5">
      <output className="sr-only">Checking export readiness</output>
      <PanelSection icon={FileDown} title="File">
        <div className="grid gap-2">
          <Skeleton className={`h-4 w-24 ${bar}`} />
          <Skeleton className={`h-9 w-full ${bar}`} />
        </div>
      </PanelSection>
      <PanelSection icon={ListFilter} title="Submissions">
        <div className="grid gap-2">
          <Skeleton className={`h-4 w-20 ${bar}`} />
          <Skeleton className={`h-9 w-full ${bar}`} />
        </div>
        <Skeleton className={`h-4 w-40 ${bar}`} />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className={`h-9 w-full ${bar}`} />
          <Skeleton className={`h-9 w-full ${bar}`} />
        </div>
      </PanelSection>
    </div>
  );
}

"use client";

import { PanelSection } from "@/components/common/panel-section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { PrepareFailure } from "../use-prepare-attempt.hook";
import type { AttachmentSelection } from "../retained-attachment";
import { SCHEMA_NEEDS_PREPARE_MESSAGE } from "../../export-error-message";
import {
  CheckCircle2,
  CircleAlert,
  FileDown,
  ListFilter,
  TriangleAlert,
} from "lucide-react";
import type { ExportDialogPhase, PrepareOutcome } from "../export-dialog-phase";
import type { IncompleteRefreshOutcome } from "../refresh-incomplete-submissions.action";
import { RetainedExportDownload } from "./retained-export-download";
import { SupportReference } from "./support-reference";

const REBUILD_PREPARE_MESSAGE =
  "Updates the reporting schema and processes submissions that are missing from the reporting data.";

interface ExportDialogStatusPanelProps {
  prepareFailure: PrepareFailure | null;
  phase: ExportDialogPhase;
  rebuildMode?: boolean;
  inlineError: string | null;
  prepareOutcome: PrepareOutcome | null;
  incompleteRefresh?: IncompleteRefreshOutcome | null;
  exportName?: string;
  retainedSelection?: AttachmentSelection | null;
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
      text: "Incomplete submissions are as of their last update.",
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
export function ExportDialogStatusPanel(
  props: Readonly<ExportDialogStatusPanelProps>,
) {
  const { phase, rebuildMode, inlineError, prepareOutcome, prepareFailure } =
    props;
  if (phase === "error" && prepareFailure)
    return (
      <PrepareFailureAlert
        failure={prepareFailure}
        retainedSelection={props.retainedSelection ?? null}
      />
    );
  if (phase === "checking") {
    return <ExportDialogSkeleton />;
  }

  if (phase === "success") {
    return <DownloadOutcomeAlert {...props} />;
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

const failureTitles = {
  refused: "Preparation did not start",
  compile: "Schema compilation failed",
  backfill: "Rebuild failed during submission processing",
  unconfirmed: "Preparation could not be completed",
};
const RETAINED_TITLE = "Rebuild stopped: two questions map to the same column";

const consequences = {
  retained:
    "Your previous reporting data was kept. Exports still use the previous schema.",
  backfill:
    "Some submissions are missing from reporting data. Exports are unavailable until a rebuild succeeds.",
  other:
    "Reporting data may be incomplete. Exports are unavailable until a rebuild succeeds.",
};

const isRetained = (failure: PrepareFailure) =>
  failure.previousSchema === "retained";

function failureTitle(failure: PrepareFailure) {
  return isRetained(failure)
    ? RETAINED_TITLE
    : failureTitles[failure.step ?? "unconfirmed"];
}

/** What the failure means for the reader's data. A refusal changed nothing. */
function failureConsequence(failure: PrepareFailure) {
  if (failure.step === "refused") return null;
  if (isRetained(failure)) return consequences.retained;
  return failure.step === "backfill"
    ? consequences.backfill
    : consequences.other;
}

// The destructive variant colours the whole description; only the title and icon stay red.
const QUIET_DESCRIPTION =
  "*:data-[slot=alert-description]:text-muted-foreground";

/** One card: what happened, what it means for the data, the reference, then what the reader can do. */
function PrepareFailureAlert({
  failure,
  retainedSelection,
}: Readonly<{
  failure: PrepareFailure;
  retainedSelection: AttachmentSelection | null;
}>) {
  const consequence = failureConsequence(failure);
  return (
    <Alert variant="destructive" className={QUIET_DESCRIPTION}>
      <CircleAlert />
      <AlertTitle className="line-clamp-none">
        {failureTitle(failure)}
      </AlertTitle>
      <AlertDescription className="gap-2">
        <p>{failure.message}</p>
        {consequence && <p className="text-foreground">{consequence}</p>}
        <SupportReference traceId={failure.traceId} />
        {consequence && (
          <FailureRemedies failure={failure} selection={retainedSelection} />
        )}
      </AlertDescription>
    </Alert>
  );
}

function FailureRemedies({
  failure,
  selection,
}: Readonly<{
  failure: PrepareFailure;
  selection: AttachmentSelection | null;
}>) {
  const retained = isRetained(failure);
  return (
    <section aria-label="What you can do" className="grid gap-2 pt-1">
      <h3 className="font-medium text-foreground">What you can do</h3>
      <p>
        {retained
          ? "Fix the question names, then rebuild."
          : "Retry the rebuild, or run a full recompile."}
      </p>
      {retained && (
        <RetainedExportDownload key={selection?.url} selection={selection} />
      )}
    </section>
  );
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

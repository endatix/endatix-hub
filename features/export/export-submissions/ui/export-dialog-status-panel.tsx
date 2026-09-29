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

const REBUILD_PREPARE_MESSAGE =
  "Updates the reporting schema and processes submissions that are missing from the reporting data.";

interface ExportDialogStatusPanelProps {
  phase: ExportDialogPhase;
  rebuildMode?: boolean;
  inlineError: string | null;
  prepareOutcome: PrepareOutcome | null;
  exportName?: string;
}

/**
 * At most one status strip, for the step the panel is on. Progress itself is
 * carried by the header description and the footer button, never repeated here.
 */
export function ExportDialogStatusPanel({
  phase,
  rebuildMode = false,
  inlineError,
  prepareOutcome,
  exportName,
}: Readonly<ExportDialogStatusPanelProps>) {
  if (phase === "checking") {
    return <ExportDialogSkeleton />;
  }

  if (phase === "success") {
    return (
      <Alert variant="success">
        <CheckCircle2 />
        <AlertTitle>
          {exportName ? `${exportName} file downloaded` : "File downloaded"}
        </AlertTitle>
        <AlertDescription>
          Find it in your browser&apos;s downloads.
        </AlertDescription>
      </Alert>
    );
  }

  if (phase === "needsPrepare" || phase === "preparing" || phase === "error") {
    let title = "Prepare required";
    if (phase === "error") {
      title = "Export failed";
    } else if (rebuildMode) {
      title = "Rebuild reporting data";
    }

    let description = SCHEMA_NEEDS_PREPARE_MESSAGE;
    if (inlineError) {
      description = inlineError;
    } else if (rebuildMode) {
      description = REBUILD_PREPARE_MESSAGE;
    }

    return (
      <Alert variant={phase === "error" ? "destructive" : "info"}>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    );
  }

  if (phase === "ready" && prepareOutcome) {
    const hasFailures = prepareOutcome.failed > 0;
    return (
      <Alert variant={hasFailures ? "warning" : "success"}>
        {hasFailures ? <TriangleAlert /> : <CheckCircle2 />}
        <AlertTitle>
          {hasFailures ? "Ready, with failed submissions" : "Ready to export"}
        </AlertTitle>
        <AlertDescription>{prepareOutcome.summary}</AlertDescription>
      </Alert>
    );
  }

  return null;
}

/** The form's sections with their bodies still loading. */
function ExportDialogSkeleton() {
  const bar = "bg-foreground/10";
  return (
    <div aria-busy="true" className="grid gap-5">
      <span className="sr-only" role="status">
        Checking export readiness
      </span>
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

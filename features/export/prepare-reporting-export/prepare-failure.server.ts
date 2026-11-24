import "server-only";

import { randomUUID } from "node:crypto";
import { TelemetryLogger } from "@/features/telemetry";
import { ErrorType, Kind, type Error as ResultError } from "@/lib/result";
import type { BackfillRunSummary } from "../backfill-reporting-submissions.server";
import type { ApiResult } from "@/lib/endatix-api/shared/api-result";

export type PrepareStep = "compile" | "backfill";

export function incompleteBackfill(
  summary: BackfillRunSummary,
): ResultError | null {
  const { finished, failed, processed, skipped } = summary;
  if (finished && failed === 0) return null;
  const reason = finished
    ? "Failed submissions are missing from the export."
    : "Some submissions still need to be processed.";
  return {
    kind: Kind.Error,
    errorType: ErrorType.Error,
    message: `${processed} processed, ${skipped} skipped, ${failed} failed. ${reason}`,
  };
}

export function previousSchema(result: ApiResult<unknown>) {
  if (
    result.success ||
    result.error.errorCode !== "ReportingSchemaAliasConflict"
  )
    return;
  const details = result.error.details;
  if (details?.statusCode !== 409 || details.previousSchemaRetained !== true)
    return;
  // A compile has no export selection. Only an actual attachment validates it.
  return "retained" as const;
}

export function recordPrepareFailure(
  formId: string,
  step: PrepareStep,
  failure: ResultError,
) {
  const traceId = failure.traceId || randomUUID();
  TelemetryLogger.warn(
    "Reporting export preparation failed",
    { formId, step, traceId, errorCode: failure.errorCode },
    "export.prepare-reporting-export",
  );
  return { ...failure, traceId, step };
}

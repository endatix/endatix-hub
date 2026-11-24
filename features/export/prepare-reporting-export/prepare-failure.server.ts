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

const LOGGER_NAME = "export.prepare-reporting-export";
const FAILURE_LOG = "Reporting export preparation failed";

/** A client-side status (4xx) is expected; anything else needs an engineer. */
function isUnexpected(failure: ResultError) {
  const status = failure.statusCode;
  return status === undefined || status >= 500;
}

/** Logs the failure under the support reference the user sees, then returns it with that reference. */
export function recordPrepareFailure(
  formId: string,
  step: PrepareStep,
  failure: ResultError,
) {
  const traceId = failure.traceId || randomUUID();
  const { statusCode, message, details, errorCode } = failure;
  const attributes = {
    formId,
    step,
    traceId,
    statusCode,
    message,
    details,
    errorCode,
  };
  if (isUnexpected(failure))
    TelemetryLogger.error(FAILURE_LOG, undefined, attributes, LOGGER_NAME);
  else TelemetryLogger.warn(FAILURE_LOG, attributes, LOGGER_NAME);
  return { ...failure, traceId, step };
}

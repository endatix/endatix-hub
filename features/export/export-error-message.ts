const BACKFILL_HINT =
  "Some submissions are not in the reporting read model yet. Ask an administrator to run backfill for this form, then try again.";

const NO_COMPLETED_HINT =
  "No completed submissions are available to export. Incomplete drafts are not included in the reporting export.";

export const SCHEMA_NEEDS_PREPARE_MESSAGE =
  "This form’s export schema has not been compiled yet. Prepare for export to compile the schema and backfill submissions.";

export const GENERIC_EXPORT_FAILURE_MESSAGE =
  "There was a problem exporting the submissions.";

const NO_COMPLETED_PHRASE = "no completed submissions are available to export";

function mentionsNoCompletedSubmissions(message: string): boolean {
  return message.toLowerCase().includes(NO_COMPLETED_PHRASE);
}

export function getExportErrorMessage(
  errorMessage: string | undefined,
  statusCode?: number,
): string {
  if (!errorMessage) {
    return statusCode === 404
      ? "Form not found or export is unavailable."
      : GENERIC_EXPORT_FAILURE_MESSAGE;
  }

  if (mentionsNoCompletedSubmissions(errorMessage)) {
    return NO_COMPLETED_HINT;
  }

  const normalized = errorMessage.toLowerCase();
  if (
    normalized.includes("backfill") ||
    normalized.includes("flattened submissions") ||
    normalized.includes("read model")
  ) {
    return BACKFILL_HINT;
  }

  // Prefer the API's own guidance for missing/invalid schema (already actionable).
  return errorMessage;
}

/** A refused export as the reader sees it: the reason, the API's support reference, and whether no rows matched. */
export type ExportProblem = {
  message: string;
  traceId?: string;
  noEligibleRows: boolean;
};

async function readErrorPayload(response: Response) {
  try {
    const payload: unknown = await response.json();
    return typeof payload === "object" && payload !== null
      ? (payload as { error?: unknown; traceId?: unknown })
      : {};
  } catch {
    return {};
  }
}

export async function readExportProblem(
  response: Response,
): Promise<ExportProblem> {
  const payload = await readErrorPayload(response);
  const error = typeof payload.error === "string" ? payload.error : undefined;
  return {
    message: getExportErrorMessage(error, response.status),
    traceId: typeof payload.traceId === "string" ? payload.traceId : undefined,
    noEligibleRows: mentionsNoCompletedSubmissions(error ?? ""),
  };
}

export async function readExportErrorMessage(
  response: Response,
): Promise<string> {
  return (await readExportProblem(response)).message;
}

export function getExportFailureMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }

  return GENERIC_EXPORT_FAILURE_MESSAGE;
}

/** True when locales/readiness failure means FormSchema has not been compiled. */
export function isExportSchemaMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("form schema") ||
    normalized.includes("compile the schema") ||
    normalized.includes("has not been compiled") ||
    (normalized.includes("formschema") && normalized.includes("not found"))
  );
}

/** True when prepare/compile/backfill can recover from this export or readiness error. */
export function isExportPrepareRecoveryError(message: string): boolean {
  if (mentionsNoCompletedSubmissions(message)) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes("form schema") ||
    normalized.includes("compile the schema") ||
    normalized.includes("has not been compiled") ||
    normalized.includes("backfill") ||
    normalized.includes("flattened submissions") ||
    normalized.includes("read model")
  );
}

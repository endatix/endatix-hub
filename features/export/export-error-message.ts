const BACKFILL_HINT =
  "Some submissions are not in the reporting read model yet. Ask an administrator to run backfill for this form, then try again.";

const NO_COMPLETED_HINT =
  "No completed submissions are available to export. Incomplete drafts are not included in the reporting export.";

export const SCHEMA_NEEDS_PREPARE_MESSAGE =
  "This form’s export schema has not been compiled yet. Prepare for export to compile the schema and backfill submissions.";

export const GENERIC_EXPORT_FAILURE_MESSAGE =
  "There was a problem exporting the submissions.";

export function getExportErrorMessage(
  errorMessage: string | undefined,
  statusCode?: number,
): string {
  if (!errorMessage) {
    return statusCode === 404
      ? "Form not found or export is unavailable."
      : GENERIC_EXPORT_FAILURE_MESSAGE;
  }

  const normalized = errorMessage.toLowerCase();
  if (normalized.includes("no completed submissions are available to export")) {
    return NO_COMPLETED_HINT;
  }

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

export async function readExportErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return getExportErrorMessage(payload.error, response.status);
  } catch {
    return getExportErrorMessage(undefined, response.status);
  }
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
    normalized.includes("not found")
  );
}

/** True when prepare/compile/backfill can recover from this export or readiness error. */
export function isExportPrepareRecoveryError(message: string): boolean {
  const normalized = message.toLowerCase();
  if (normalized.includes("no completed submissions are available to export")) {
    return false;
  }

  return (
    normalized.includes("form schema") ||
    normalized.includes("compile the schema") ||
    normalized.includes("has not been compiled") ||
    normalized.includes("backfill") ||
    normalized.includes("flattened submissions") ||
    normalized.includes("read model")
  );
}

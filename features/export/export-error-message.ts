const BACKFILL_HINT =
  "Some submissions are not in the reporting read model yet. Ask an administrator to run backfill for this form, then try again.";

export function getExportErrorMessage(
  errorMessage: string | undefined,
  statusCode?: number,
): string {
  if (!errorMessage) {
    return statusCode === 404
      ? "Form not found or export is unavailable."
      : "There was a problem exporting the submissions.";
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

  return "There was a problem exporting the submissions.";
}

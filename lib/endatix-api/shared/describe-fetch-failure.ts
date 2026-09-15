type FetchFailureDescription = {
  message: string;
  causeCode?: string;
  causeName?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readCauseCode(cause: unknown): string | undefined {
  if (!isRecord(cause)) {
    return undefined;
  }

  const code = cause.code;
  return typeof code === "string" && code.length > 0 ? code : undefined;
}

function readCauseName(cause: unknown): string | undefined {
  if (cause instanceof Error) {
    return cause.name;
  }

  if (!isRecord(cause)) {
    return undefined;
  }

  const name = cause.name;
  return typeof name === "string" && name.length > 0 ? name : undefined;
}

/**
 * Flattens Node/`undici` `TypeError: fetch failed` plus `error.cause`
 * into telemetry-safe scalars. Does not include URLs or tokens.
 */
export function describeFetchFailure(error: unknown): FetchFailureDescription {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error.cause : undefined;

  return {
    message,
    causeCode: readCauseCode(cause),
    causeName: readCauseName(cause),
  };
}

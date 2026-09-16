import type { LogAttributes } from "@/features/telemetry/infrastructure/telemetry-logger";
import type { ApiError } from "@/lib/endatix-api/shared/api-result";

/**
 * Flattens ApiError into telemetry-safe scalar attributes.
 */
export function mapApiErrorToTelemetryAttributes(
  apiError: ApiError,
): LogAttributes {
  const details = apiError.error.details;

  return {
    apiErrorType: apiError.error.type,
    apiErrorCode: apiError.error.errorCode,
    apiErrorStatusCode: details?.statusCode,
    apiErrorEndpoint: sanitizeEndpoint(details?.endpoint),
    apiErrorMethod: details?.method,
    apiErrorRetryAfter: details?.retryAfter,
    apiErrorTraceId: details?.traceId,
    apiErrorCauseCode: details?.causeCode,
    apiErrorCauseName: details?.causeName,
  };
}

const TOKEN_PATH_SEGMENTS = new Set(["by-access-token", "by-token"]);

function sanitizeEndpoint(endpoint: string | undefined): string | undefined {
  const pathOnly = endpoint?.split(/[?#]/, 1)[0];
  if (!pathOnly) {
    return undefined;
  }

  const segments = pathOnly.split("/");
  const redacted = segments.map((segment, index) => {
    const previous = segments[index - 1];
    if (previous && TOKEN_PATH_SEGMENTS.has(previous)) {
      return "[redacted]";
    }
    return segment;
  });

  return redacted.join("/");
}

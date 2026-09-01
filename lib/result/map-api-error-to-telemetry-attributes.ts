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
  };
}

function sanitizeEndpoint(endpoint: string | undefined): string | undefined {
  return endpoint?.split(/[?#]/, 1)[0];
}

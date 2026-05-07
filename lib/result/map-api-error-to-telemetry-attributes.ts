import type { LogAttributes } from "@/features/telemetry/infrastructure/telemetry-logger";
import type { ApiError } from "@/lib/endatix-api/shared/api-result";

/**
 * Flattens ApiError into telemetry-safe scalar attributes.
 */
export function mapApiErrorToTelemetryAttributes(
  apiError: ApiError,
): LogAttributes {
  return {
    apiErrorType: apiError.error.type,
    apiErrorMessage: apiError.error.message,
    apiErrorCode: apiError.error.errorCode,
    apiErrorDetails: apiError.error.details
      ? JSON.stringify(apiError.error.details)
      : undefined,
  };
}

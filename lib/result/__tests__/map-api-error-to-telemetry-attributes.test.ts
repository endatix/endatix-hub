import { describe, expect, it } from 'vitest';
import { ApiErrorType, type ApiError } from '@/lib/endatix-api';
import { mapApiErrorToTelemetryAttributes } from '@/lib/result/map-api-error-to-telemetry-attributes';

describe('mapApiErrorToTelemetryAttributes', () => {
  it('includes apiErrorTraceId when present on details', () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        type: ApiErrorType.ValidationError,
        message: 'Name is required.',
        errorCode: 'NotEmptyValidator',
        details: {
          statusCode: 400,
          endpoint: '/api/forms',
          method: 'POST',
          traceId: '00-abc-def-01',
        },
      },
    };

    // Act
    const attrs = mapApiErrorToTelemetryAttributes(apiError);

    // Assert
    expect(attrs.apiErrorTraceId).toBe('00-abc-def-01');
    expect(attrs.apiErrorStatusCode).toBe(400);
    expect(attrs.apiErrorCode).toBe('NotEmptyValidator');
  });
});

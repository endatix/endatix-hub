import { describe, expect, it } from 'vitest';
import { ApiErrorType, type ApiError } from '@/lib/endatix-api';
import { DataLoadError } from '@/lib/errors/data-load-error';

describe('DataLoadError', () => {
  it('copies ProblemDetails support fields from an ApiError', () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        type: ApiErrorType.ServerError,
        message: 'Something went wrong.',
        errorCode: 'Unhandled',
        details: {
          statusCode: 500,
          traceId: '00-abc-def-01',
        },
      },
    };

    // Act
    const thrown = DataLoadError.fromApiError(apiError);

    // Assert
    expect(thrown).toBeInstanceOf(DataLoadError);
    expect(thrown.traceId).toBe('00-abc-def-01');
    expect(thrown.errorCode).toBe('Unhandled');
    expect(thrown.statusCode).toBe(500);
  });
});

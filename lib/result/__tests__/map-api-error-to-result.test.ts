import { describe, expect, it } from 'vitest';
import { ApiErrorType, type ApiError } from '@/lib/endatix-api';
import { ErrorType } from '@/lib/result';
import { mapApiErrorToResult } from '@/lib/result/map-api-error-to-result';

describe('mapApiErrorToResult', () => {
  it('copies ProblemDetails traceId and status onto Result', () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        type: ApiErrorType.ValidationError,
        message: 'We have a problem',
        errorCode: 'ValidationError',
        details: {
          statusCode: 400,
          details: 'We have a problem',
          endpoint: '/api/forms',
          method: 'GET',
          traceId: '00-7c4136e87655d6da47ee643c221f630b-ef3c8ae2be5da5dd-00',
        },
      },
    };

    // Act
    const result = mapApiErrorToResult(apiError);

    // Assert
    expect(result.kind).toBeDefined();
    expect(result).toMatchObject({
      errorType: ErrorType.ValidationError,
      message: 'We have a problem',
      errorCode: 'ValidationError',
      traceId: '00-7c4136e87655d6da47ee643c221f630b-ef3c8ae2be5da5dd-00',
      statusCode: 400,
    });
  });

  it('copies support fields for non-validation ApiErrors', () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        type: ApiErrorType.ServerError,
        message: 'Boom',
        details: {
          statusCode: 500,
          traceId: '00-abc-def-01',
        },
      },
    };

    // Act
    const result = mapApiErrorToResult(apiError, {
      fallbackMessage: 'Failed',
    });

    // Assert
    expect(result).toMatchObject({
      errorType: ErrorType.Error,
      message: 'Boom',
      traceId: '00-abc-def-01',
      statusCode: 500,
    });
  });
});

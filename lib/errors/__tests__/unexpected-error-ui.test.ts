import { describe, expect, it } from 'vitest';
import { ApiErrorType } from '@/lib/endatix-api';
import {
  buildUnexpectedErrorDiagnostics,
  diagnosticsFromResult,
  formatUnexpectedErrorClipboard,
  getUnexpectedErrorUi,
  unexpectedErrorKindFromApiErrorType,
  unexpectedErrorUiByKind,
  unexpectedErrorUiFromResult,
} from '@/lib/errors/unexpected-error-ui';
import { ErrorType, Result } from '@/lib/result';

describe('unexpected-error-ui', () => {
  it('defaults to a generic 500 page for unknown messages', () => {
    // Arrange
    const error = new Error('Something exploded');

    // Act
    const ui = getUnexpectedErrorUi(error);

    // Assert
    expect(ui.kind).toBe('general');
    expect(ui.statusCode).toBe('500');
    expect(ui.title).toContain('Something went wrong');
  });

  it('maps forbidden-like messages to authorization UI', () => {
    // Arrange
    const error = new Error('Forbidden: missing permission');

    // Act
    const ui = getUnexpectedErrorUi(error);

    // Assert
    expect(ui.kind).toBe('authorization');
    expect(ui.statusCode).toBe('403');
  });

  it('maps ApiErrorType to unexpected error kinds', () => {
    // Arrange & Act & Assert
    expect(unexpectedErrorKindFromApiErrorType(ApiErrorType.NetworkError)).toBe(
      'network',
    );
    expect(unexpectedErrorKindFromApiErrorType(ApiErrorType.ForbiddenError)).toBe(
      'authorization',
    );
    expect(unexpectedErrorKindFromApiErrorType(ApiErrorType.ServerError)).toBe(
      'service',
    );
    expect(unexpectedErrorKindFromApiErrorType(ApiErrorType.ValidationError)).toBe(
      'client',
    );
  });

  it('returns stable copy for each kind', () => {
    // Arrange & Act
    const service = unexpectedErrorUiByKind('service');

    // Assert
    expect(service.statusCode).toBe('503');
    expect(service.message.length).toBeGreaterThan(0);
  });

  it('maps Result validation errors to 400 client UI with diagnostics', () => {
    // Arrange
    const result = Result.validationError(
      'We have a problem',
      'We have a problem',
      'ValidationError',
      {
        statusCode: 400,
        traceId: '00-7c4136e87655d6da47ee643c221f630b-ef3c8ae2be5da5dd-00',
      },
    );

    // Act
    if (!Result.isError(result)) {
      throw new Error('expected error result');
    }
    const ui = unexpectedErrorUiFromResult(result);
    const diagnostics = diagnosticsFromResult(result);

    // Assert
    expect(result.errorType).toBe(ErrorType.ValidationError);
    expect(ui.kind).toBe('client');
    expect(ui.statusCode).toBe('400');
    expect(diagnostics.traceId).toBe(
      '00-7c4136e87655d6da47ee643c221f630b-ef3c8ae2be5da5dd-00',
    );
    expect(diagnostics.statusCode).toBe(400);
  });

  it('reads traceId from the thrown error when present', () => {
    // Arrange
    const error = Object.assign(new Error('HTTP 500'), {
      digest: '3804550175',
      traceId: '00-3e8ae15ae4ce3ba3-3b194d24e8d42867-00',
      errorCode: 'ServerError',
      statusCode: 500,
    });

    // Act
    const diagnostics = buildUnexpectedErrorDiagnostics(error);

    // Assert
    expect(diagnostics.digest).toBe('3804550175');
    expect(diagnostics.traceId).toBe(
      '00-3e8ae15ae4ce3ba3-3b194d24e8d42867-00',
    );
    expect(diagnostics.errorCode).toBe('ServerError');
    expect(diagnostics.statusCode).toBe(500);
  });

  it('omits missing traceId from the clipboard payload', () => {
    // Arrange
    const diagnostics = { digest: 'abc' };

    // Act
    const payload = formatUnexpectedErrorClipboard(diagnostics, {
      path: '/forms',
      statusLabel: '503',
    });

    // Assert
    expect(payload).toContain('Digest: abc');
    expect(payload).toContain('Path: /forms');
    expect(payload).not.toContain('Trace ID:');
  });
});

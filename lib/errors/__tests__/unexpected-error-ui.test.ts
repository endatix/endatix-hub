import { describe, expect, it } from 'vitest';
import { ApiErrorType } from '@/lib/endatix-api';
import {
  getUnexpectedErrorUi,
  unexpectedErrorKindFromApiErrorType,
  unexpectedErrorUiByKind,
} from '@/lib/errors/unexpected-error-ui';

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
      'general',
    );
  });

  it('returns stable copy for each kind', () => {
    // Arrange & Act
    const service = unexpectedErrorUiByKind('service');

    // Assert
    expect(service.statusCode).toBe('503');
    expect(service.message.length).toBeGreaterThan(0);
  });
});

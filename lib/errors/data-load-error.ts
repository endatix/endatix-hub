import type { ApiError } from '@/lib/endatix-api';
import type { UnexpectedErrorDiagnostics } from '@/lib/errors/unexpected-error-ui';

/**
 * Thrown from server loaders so `error.tsx` can show a fallback.
 * Optional support fields survive on client-thrown errors; Next.js may strip
 * them from Server Component errors in production (digest still matches logs).
 */
export class DataLoadError extends Error {
  readonly traceId?: string;
  readonly errorCode?: string;
  readonly statusCode?: number;

  constructor(message: string, diagnostics: UnexpectedErrorDiagnostics = {}) {
    super(message);
    this.name = 'DataLoadError';
    this.traceId = diagnostics.traceId;
    this.errorCode = diagnostics.errorCode;
    this.statusCode = diagnostics.statusCode;
  }

  static fromApiError(apiError: ApiError): DataLoadError {
    return new DataLoadError(apiError.error.message, {
      traceId: apiError.error.details?.traceId,
      errorCode: apiError.error.errorCode,
      statusCode: apiError.error.details?.statusCode,
    });
  }
}

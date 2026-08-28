import { ApiErrorType } from '@/lib/endatix-api';

export type UnexpectedErrorKind =
  | 'general'
  | 'authorization'
  | 'network'
  | 'service';

export interface UnexpectedErrorUi {
  kind: UnexpectedErrorKind;
  statusCode: string;
  title: string;
  subtitle: string;
  message: string;
}

export interface UnexpectedErrorDiagnostics {
  digest?: string;
  traceId?: string;
  errorCode?: string;
  statusCode?: number;
}

/**
 * Maps an unexpected boundary error into safe user-facing copy.
 * Production must not rely on raw server `error.message`.
 */
export function getUnexpectedErrorUi(error: Error): UnexpectedErrorUi {
  const normalizedMessage = error.message.toLowerCase();

  if (
    normalizedMessage.includes('unauthorized') ||
    normalizedMessage.includes('forbidden')
  ) {
    return unexpectedErrorUiByKind('authorization');
  }

  if (
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('fetch failed') ||
    normalizedMessage.includes('timeout')
  ) {
    return unexpectedErrorUiByKind('network');
  }

  if (
    normalizedMessage.includes('service unavailable') ||
    normalizedMessage.includes('503')
  ) {
    return unexpectedErrorUiByKind('service');
  }

  return unexpectedErrorUiByKind('general');
}

export function unexpectedErrorUiByKind(
  kind: UnexpectedErrorKind,
): UnexpectedErrorUi {
  switch (kind) {
    case 'authorization':
      return {
        kind,
        statusCode: '403',
        title: 'You do not have permission to perform this action.',
        subtitle: 'Access was denied for this request.',
        message:
          'Please verify your permissions or switch to an account with the required access.',
      };
    case 'network':
      return {
        kind,
        statusCode: '503',
        title: 'A temporary network issue interrupted this request.',
        subtitle: 'We could not reach the service.',
        message:
          'Check your connection and retry. If this continues, please contact support.',
      };
    case 'service':
      return {
        kind,
        statusCode: '503',
        title: 'This service is temporarily unavailable.',
        subtitle: 'Please try again in a moment.',
        message:
          'We are restoring normal operation. Retry shortly or contact support if it persists.',
      };
    case 'general':
    default:
      return {
        kind: 'general',
        statusCode: '500',
        title: 'Something went wrong.',
        subtitle: 'An unexpected error interrupted this page.',
        message:
          'Try again. If the issue persists, share diagnostics with support.',
      };
  }
}

export function unexpectedErrorKindFromApiErrorType(
  type: ApiErrorType,
): UnexpectedErrorKind {
  switch (type) {
    case ApiErrorType.NetworkError:
      return 'network';
    case ApiErrorType.AuthError:
    case ApiErrorType.ForbiddenError:
      return 'authorization';
    case ApiErrorType.ServerError:
    case ApiErrorType.RateLimitError:
      return 'service';
    default:
      return 'general';
  }
}

type ErrorWithSupportMetadata = Error & {
  digest?: string;
  traceId?: string;
  errorCode?: string;
  statusCode?: number;
};

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Collects support identifiers from a boundary error.
 * Prefer API `traceId` (OpenTelemetry / ProblemDetails) when present; always keep Next `digest`.
 */
export function buildUnexpectedErrorDiagnostics(
  error: Error & { digest?: string },
): UnexpectedErrorDiagnostics {
  const withMeta = error as ErrorWithSupportMetadata;
  const cause = error.cause as ErrorWithSupportMetadata | undefined;

  return {
    digest: readOptionalString(withMeta.digest),
    traceId:
      readOptionalString(withMeta.traceId) ?? readOptionalString(cause?.traceId),
    errorCode:
      readOptionalString(withMeta.errorCode) ??
      readOptionalString(cause?.errorCode),
    statusCode:
      readOptionalNumber(withMeta.statusCode) ??
      readOptionalNumber(cause?.statusCode),
  };
}

export function formatUnexpectedErrorClipboard(
  diagnostics: UnexpectedErrorDiagnostics,
  extras: { path?: string; statusLabel?: string; details?: string },
): string {
  const lines = ['Endatix Hub error'];

  if (extras.path) {
    lines.push(`Path: ${extras.path}`);
  }

  lines.push(`Timestamp: ${new Date().toISOString()}`);

  if (diagnostics.digest) {
    lines.push(`Digest: ${diagnostics.digest}`);
  }

  if (diagnostics.traceId) {
    lines.push(`Trace ID: ${diagnostics.traceId}`);
  }

  if (diagnostics.errorCode) {
    lines.push(`Error code: ${diagnostics.errorCode}`);
  }

  const httpStatus = diagnostics.statusCode ?? extras.statusLabel;
  if (httpStatus !== undefined) {
    lines.push(`HTTP status: ${httpStatus}`);
  }

  if (extras.details) {
    lines.push(`Details: ${extras.details}`);
  }

  return lines.join('\n');
}

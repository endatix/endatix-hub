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

export function buildUnexpectedErrorDiagnostics(
  error: Error & { digest?: string },
): UnexpectedErrorDiagnostics {
  return {
    digest: error.digest,
  };
}

/**
 * Error types for permission operations
 */
const DEFAULT_PERMISSION_ERROR_MESSAGE = "An unexpected error occurred while checking permissions";
enum PermissionErrorType {
  AuthenticationRequired = "AUTHENTICATION_REQUIRED",
  PermissionDenied = "PERMISSION_DENIED",
  ServerError = "SERVER_ERROR",
}

interface PermissionErrorDetails {
  permission?: string;
  userId?: string;
  tenantId?: string;
  details?: Record<string, unknown>;
}

type PermissionSuccess<T> = {
  success: true;
  data: T;
};

type PermissionError = {
  success: false;
  error: {
    type: PermissionErrorType;
    message: string;
    details?: PermissionErrorDetails;
  };
};

type PermissionResult<T = never> = PermissionSuccess<T> | PermissionError;

const PermissionResult = {
  success: <T = void>(data?: T): PermissionSuccess<T> => ({
    success: true,
    data: data as T,
  }),

  unauthenticated: <T = never>(
    message?: string,
    details?: PermissionErrorDetails,
  ): PermissionResult<T> => ({
    success: false,
    error: {
      type: PermissionErrorType.AuthenticationRequired,
      message: message || "You must be authenticated to access this resource",
      details,
    },
  }),

  forbidden: <T = never>(
    message?: string,
    details?: PermissionErrorDetails,
  ): PermissionResult<T> => ({
    success: false,
    error: {
      type: PermissionErrorType.PermissionDenied,
      message: message || "You are not authorized to access this resource",
      details,
    },
  }),

  error: <T = never>(
    type: PermissionErrorType = PermissionErrorType.ServerError,
    message: string = "Could not process the permission request",
    details?: PermissionErrorDetails,
  ): PermissionResult<T> => ({
    success: false,
    error: {
      type,
      message,
      details,
    },
  }),

  isSuccess: <T>(result: PermissionResult<T>): result is PermissionSuccess<T> =>
    result.success,

  isError: <T>(result: PermissionResult<T>): result is PermissionError =>
    !result.success,

  getErrorType: <T>(
    result: PermissionResult<T>,
  ): PermissionErrorType | null => {
    return result.success ? null : result.error.type;
  },

  getErrorMessage: <T>(result: PermissionResult<T>): string | null => {
    return result.success ? null : result.error.message;
  },

  getErrorDetails: <T>(
    result: PermissionResult<T>,
  ): PermissionErrorDetails | null => {
    return result.success ? null : result.error.details || null;
  },
};

// Helper type guards for specific error types
const isAuthenticationRequired = <T>(result: PermissionResult<T>): boolean =>
  !result.success &&
  result.error.type === PermissionErrorType.AuthenticationRequired;

const isPermissionDenied = <T>(result: PermissionResult<T>): boolean =>
  !result.success && result.error.type === PermissionErrorType.PermissionDenied;

const isServerError = <T>(result: PermissionResult<T>): boolean =>
  !result.success && result.error.type === PermissionErrorType.ServerError;

export type {
  PermissionErrorType,
  PermissionErrorDetails,
  PermissionSuccess,
  PermissionError,
  PermissionResult as PermissionResultType,
};

export {
  PermissionResult,
  isAuthenticationRequired,
  isPermissionDenied,
  isServerError,
  DEFAULT_PERMISSION_ERROR_MESSAGE,
};

/**
 * Error types for permission operations
 */
const DEFAULT_PERMISSION_ERROR_MESSAGE =
  "An unexpected error occurred while checking permissions";
enum AuthorizationErrorType {
  AuthenticationRequired = "AUTHENTICATION_REQUIRED",
  AccessDenied = "ACCESS_DENIED",
  ServerError = "SERVER_ERROR",
}

interface AuthorizationErrorDetails {
  permission?: string;
  userId?: string;
  tenantId?: string;
  details?: Record<string, unknown>;
}

type AuthorizationSuccess<T> = {
  success: true;
  data: T;
};

type AuthorizationError = {
  success: false;
  error: {
    type: AuthorizationErrorType;
    message: string;
    details?: AuthorizationErrorDetails;
  };
};

type AuthorizationResult<T = never> =
  | AuthorizationSuccess<T>
  | AuthorizationError;

const AuthorizationResult = {
  success: <T = void>(data?: T): AuthorizationSuccess<T> => ({
    success: true,
    data: data as T,
  }),

  unauthenticated: <T = never>(
    message?: string,
    details?: AuthorizationErrorDetails,
  ): AuthorizationResult<T> => ({
    success: false,
    error: {
      type: AuthorizationErrorType.AuthenticationRequired,
      message: message || "You must be authenticated to access this resource",
      details,
    },
  }),

  forbidden: <T = never>(
    message?: string,
    details?: AuthorizationErrorDetails,
  ): AuthorizationResult<T> => ({
    success: false,
    error: {
      type: AuthorizationErrorType.AccessDenied,
      message: message || "You are not authorized to access this resource",
      details,
    },
  }),

  error: <T = never>(
    type: AuthorizationErrorType = AuthorizationErrorType.ServerError,
    message: string = "Could not process the authorization request",
    details?: AuthorizationErrorDetails,
  ): AuthorizationResult<T> => ({
    success: false,
    error: {
      type,
      message,
      details,
    },
  }),

  isSuccess: <T>(
    result: AuthorizationResult<T>,
  ): result is AuthorizationSuccess<T> => result.success,

  isError: <T>(result: AuthorizationResult<T>): result is AuthorizationError =>
    !result.success,

  getErrorType: <T>(
    result: AuthorizationResult<T>,
  ): AuthorizationErrorType | null => {
    return result.success ? null : result.error.type;
  },

  getErrorMessage: <T>(result: AuthorizationResult<T>): string | null => {
    return result.success ? null : result.error.message;
  },

  getErrorDetails: <T>(
    result: AuthorizationResult<T>,
  ): AuthorizationErrorDetails | null => {
    return result.success ? null : result.error.details || null;
  },
};

// Helper type guards for specific error types
const isAuthenticationRequired = <T>(result: AuthorizationResult<T>): boolean =>
  !result.success &&
  result.error.type === AuthorizationErrorType.AuthenticationRequired;

const isPermissionDenied = <T>(result: AuthorizationResult<T>): boolean =>
  !result.success && result.error.type === AuthorizationErrorType.AccessDenied;

const isServerError = <T>(result: AuthorizationResult<T>): boolean =>
  !result.success && result.error.type === AuthorizationErrorType.ServerError;

export type {
  AuthorizationErrorType,
  AuthorizationErrorDetails,
  AuthorizationSuccess,
  AuthorizationError,
};

export {
  AuthorizationResult,
  isAuthenticationRequired,
  isPermissionDenied,
  isServerError,
  DEFAULT_PERMISSION_ERROR_MESSAGE,
};

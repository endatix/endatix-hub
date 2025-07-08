import {
  DEFAULT_ERROR_MESSAGE,
  ERROR_CODE,
  getErrorMessage,
  getErrorMessageWithFallback,
  isKnownErrorCode,
  type ErrorCode,
} from "./error-codes";

// API-specific error types
export enum ApiErrorType {
  NetworkError = "NetworkError", // Network issues e.g. connection error, gateway timeout, etc.
  AuthError = "AuthError", // Authentication/authorization issues
  ValidationError = "ValidationError", // Client data issues e.g. validation issues or bad request
  ServerError = "ServerError", // Server issues e.g. internal server error
  NotFoundError = "NotFoundError", // Resource not found e.g. form not found
  RateLimitError = "RateLimitError", // Rate limit exceeded e.g. too many requests
  JsonParseError = "JsonParseError", // JSON parse error
  UnknownError = "UnknownError", // Unknown error
}

export interface ApiErrorDetails {
  statusCode?: number;
  endpoint?: string;
  method?: string;
  details?: string;
  retryAfter?: number;
}

// Simple, self-contained Result types
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    type: ApiErrorType;
    message: string;
    errorCode?: string;
    details?: ApiErrorDetails;
  };
};

export type ApiResult<T> = ApiSuccess<T> | ApiError;

export const ApiResult = {
  success: <T>(data: T): ApiSuccess<T> => ({
    success: true,
    data,
  }),

  networkError: <T>(
    message?: string,
    details?: ApiErrorDetails,
  ): ApiResult<T> => ({
    success: false,
    error: {
      type: ApiErrorType.NetworkError,
      message: message || getErrorMessageWithFallback(ERROR_CODE.NETWORK_ERROR),
      errorCode: ERROR_CODE.NETWORK_ERROR,
      details,
    },
  }),

  authError: <T>(
    message?: string,
    errorCode?: ErrorCode,
    details?: ApiErrorDetails,
  ): ApiResult<T> => ({
    success: false,
    error: {
      type: ApiErrorType.AuthError,
      message:
        message ||
        getErrorMessageWithFallback(ERROR_CODE.AUTHENTICATION_REQUIRED),
      errorCode: errorCode || ERROR_CODE.AUTHENTICATION_REQUIRED,
      details,
    },
  }),

  validationError: <T>(
    message?: string,
    errorCode?: ErrorCode,
    details?: ApiErrorDetails,
  ): ApiResult<T> => ({
    success: false,
    error: {
      type: ApiErrorType.ValidationError,
      message:
        message || getErrorMessageWithFallback(ERROR_CODE.VALIDATION_ERROR),
      errorCode: errorCode || ERROR_CODE.VALIDATION_ERROR,
      details,
    },
  }),

  serverError: <T>(
    message?: string,
    details?: ApiErrorDetails,
  ): ApiResult<T> => ({
    success: false,
    error: {
      type: ApiErrorType.ServerError,
      message: message || getErrorMessageWithFallback(ERROR_CODE.SERVER_ERROR),
      errorCode: ERROR_CODE.SERVER_ERROR,
      details,
    },
  }),

  notFoundError: <T>(
    message?: string,
    details?: ApiErrorDetails,
  ): ApiResult<T> => ({
    success: false,
    error: {
      type: ApiErrorType.NotFoundError,
      message:
        message || getErrorMessageWithFallback(ERROR_CODE.RESOURCE_NOT_FOUND),
      errorCode: ERROR_CODE.RESOURCE_NOT_FOUND,
      details,
    },
  }),

  rateLimitError: <T>(
    message?: string,
    details?: ApiErrorDetails,
  ): ApiResult<T> => ({
    success: false,
    error: {
      type: ApiErrorType.RateLimitError,
      message:
        message || getErrorMessageWithFallback(ERROR_CODE.RATE_LIMIT_EXCEEDED),
      errorCode: ERROR_CODE.RATE_LIMIT_EXCEEDED,
      details,
    },
  }),

  jsonParseError: <T>(
    message?: string,
    details?: ApiErrorDetails,
  ): ApiResult<T> => ({
    success: false,
    error: {
      type: ApiErrorType.JsonParseError,
      message:
        message || getErrorMessageWithFallback(ERROR_CODE.JSON_PARSE_ERROR),
      errorCode: ERROR_CODE.JSON_PARSE_ERROR,
      details,
    },
  }),

  unknownError: <T>(
    message?: string,
    details?: ApiErrorDetails,
  ): ApiResult<T> => ({
    success: false,
    error: {
      type: ApiErrorType.UnknownError,
      message: message || getErrorMessageWithFallback(ERROR_CODE.UNKNOWN_ERROR),
      errorCode: ERROR_CODE.UNKNOWN_ERROR,
      details,
    },
  }),

  isSuccess: <T>(result: ApiResult<T>): result is ApiSuccess<T> =>
    result.success,

  isError: <T>(result: ApiResult<T>): result is ApiError => !result.success,

  getErrorType: <T>(result: ApiResult<T>): ApiErrorType | null => {
    return result.success ? null : result.error.type;
  },

  getErrorDetails: <T>(result: ApiResult<T>): ApiErrorDetails | null => {
    return result.success ? null : result.error.details || null;
  },

  getErrorMessage: <T>(result: ApiResult<T>): string | null => {
    return result.success ? null : result.error.message;
  },

  getErrorCode: <T>(result: ApiResult<T>): string | null => {
    return result.success ? null : result.error.errorCode || null;
  },

  getUserFriendlyMessage: <T>(result: ApiResult<T>): string | null => {
    if (result.success) return null;

    if (result.error.message) {
      return result.error.message;
    }

    const errorCode = result.error.errorCode;
    if (errorCode && isKnownErrorCode(errorCode)) {
      return getErrorMessage(errorCode);
    }

    return DEFAULT_ERROR_MESSAGE;
  },
};

// Helper type guards for specific error types
export const isNetworkError = <T>(result: ApiResult<T>): boolean =>
  !result.success && result.error.type === ApiErrorType.NetworkError;

export const isAuthError = <T>(result: ApiResult<T>): boolean =>
  !result.success && result.error.type === ApiErrorType.AuthError;

export const isValidationError = <T>(result: ApiResult<T>): boolean =>
  !result.success && result.error.type === ApiErrorType.ValidationError;

export const isServerError = <T>(result: ApiResult<T>): boolean =>
  !result.success && result.error.type === ApiErrorType.ServerError;

export const isNotFoundError = <T>(result: ApiResult<T>): boolean =>
  !result.success && result.error.type === ApiErrorType.NotFoundError;

export const isRateLimitError = <T>(result: ApiResult<T>): boolean =>
  !result.success && result.error.type === ApiErrorType.RateLimitError;

// Helper functions for specific error codes
export const hasErrorCode = <T>(
  result: ApiResult<T>,
  errorCode: ErrorCode,
): boolean => {
  return !result.success && result.error.errorCode === errorCode;
};

export const isRecaptchaError = <T>(result: ApiResult<T>): boolean =>
  hasErrorCode(result, ERROR_CODE.RECAPTCHA_VERIFICATION_FAILED);

export const isTokenInvalidError = <T>(result: ApiResult<T>): boolean =>
  hasErrorCode(result, ERROR_CODE.SUBMISSION_TOKEN_INVALID);

export const isFormNotFoundError = <T>(result: ApiResult<T>): boolean =>
  hasErrorCode(result, ERROR_CODE.FORM_NOT_FOUND);

// Re-export error codes for convenience
export { ERROR_CODE } from "./error-codes";

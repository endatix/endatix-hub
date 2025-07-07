const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred.";

// Error code to user-friendly message mapping
const ERROR_CODES = Object.freeze({
  recaptcha_verification_failed: "reCAPTCHA validation failed.",
  form_not_found: "The form you are trying to access does not exist.",
  submission_token_invalid: "Your submission session has expired.",
  network_error:
    "Network connection failed. Please check your internet connection.",
  authentication_required:
    "Authentication is required to access this resource.",
  access_forbidden: "You don't have permission to access this resource.",
  resource_not_found: "The requested resource was not found.",
  rate_limit_exceeded: "Too many requests. Please try again later.",
  server_error: "Server error occurred. Please try again later.",
  validation_error: "The provided data is invalid.",
  json_parse_error: "Failed to parse server response.",
  unknown_error: "An unknown error occurred.",
} as const);

// Type for all valid error code keys
type ErrorCode = keyof typeof ERROR_CODES;

// Error code string literals for logic branching
const ERROR_CODE = Object.freeze({
  RECAPTCHA_VERIFICATION_FAILED: "recaptcha_verification_failed",
  FORM_NOT_FOUND: "form_not_found",
  SUBMISSION_TOKEN_INVALID: "submission_token_invalid",
  NETWORK_ERROR: "network_error",
  AUTHENTICATION_REQUIRED: "authentication_required",
  ACCESS_FORBIDDEN: "access_forbidden",
  RESOURCE_NOT_FOUND: "resource_not_found",
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
  SERVER_ERROR: "server_error",
  VALIDATION_ERROR: "validation_error",
  JSON_PARSE_ERROR: "json_parse_error",
  UNKNOWN_ERROR: "unknown_error",
} as const);

/**
 * Check if a given error code is known.
 * @param errorCode - The error code to check.
 * @returns True if the error code is known, false otherwise.
 */
function isKnownErrorCode(errorCode?: string): boolean {
  return Object.values(ERROR_CODE).includes(errorCode as ErrorCode);
}

/**
 * Get a user-friendly message for a given error code.
 * Returns null if the code is unknown.
 */
function getErrorMessage(errorCode?: string): string | null {
  if (!errorCode) {
    return null;
  }
  return ERROR_CODES[errorCode as ErrorCode] ?? null;
}

/**
 * Get a user-friendly message for a given error code with fallback.
 * Returns the default message if the code is unknown.
 */
function getErrorMessageWithFallback(
  errorCode?: string,
  fallbackMessage?: string,
): string {
  const message = getErrorMessage(errorCode);
  return message ?? fallbackMessage ?? DEFAULT_ERROR_MESSAGE;
}

export {
  ERROR_CODES,
  ERROR_CODE,
  DEFAULT_ERROR_MESSAGE,
  getErrorMessage,
  getErrorMessageWithFallback,
  isKnownErrorCode,
};
export type { ErrorCode };

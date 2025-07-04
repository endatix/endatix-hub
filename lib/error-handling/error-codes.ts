const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred.";
// Error code to user-friendly message mapping
export const ERROR_CODES = {
  recaptcha_verification_failed:
    "reCAPTCHA validation failed.",
  form_not_found: "The form you are trying to access does not exist.",
  submission_expired:
    "Your submission session has expired.",
  // ...add more codes as needed
} as const;

// Type for all valid error code keys
export type ErrorCode = keyof typeof ERROR_CODES;

// Error code string literals for logic branching
export const ERROR_CODE = {
  RECAPTCHA_VERIFICATION_FAILED: "recaptcha_verification_failed",
  FORM_NOT_FOUND: "form_not_found",
  SUBMISSION_EXPIRED: "submission_expired",
  // ...add more as needed
} as const;

export function isKnownErrorCode(errorCode?: string): boolean {
  return Object.values(ERROR_CODE).includes(errorCode as ErrorCode);
}

/**
 * Get a user-friendly message for a given error code.
 * Falls back to a generic message if the code is unknown.
 */
export function getErrorMessage(errorCode?: string): string | null {
  if (!errorCode) {
    return DEFAULT_ERROR_MESSAGE;
  }
  return ERROR_CODES[errorCode as ErrorCode] || DEFAULT_ERROR_MESSAGE;
}

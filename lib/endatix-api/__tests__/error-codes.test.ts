import { describe, it, expect } from "vitest";
import {
  ERROR_CODES,
  ERROR_CODE,
  DEFAULT_ERROR_MESSAGE,
  getErrorMessage,
  getErrorMessageWithFallback,
  isKnownErrorCode,
  type ErrorCode,
} from "../shared/error-codes";

describe("ERROR_CODES", () => {
  it("should contain all expected error codes with messages", () => {
    // Arrange
    const expectedErrorCodes = [
      "recaptcha_verification_failed",
      "form_not_found",
      "submission_token_invalid",
      "network_error",
      "authentication_required",
      "access_forbidden",
      "resource_not_found",
      "rate_limit_exceeded",
      "server_error",
      "validation_error",
      "json_parse_error",
      "unknown_error",
    ];

    // Act & Assert
    expectedErrorCodes.forEach((code) => {
      expect(ERROR_CODES[code as ErrorCode]).toBeDefined();
      expect(typeof ERROR_CODES[code as ErrorCode]).toBe("string");
      expect(ERROR_CODES[code as ErrorCode].length).toBeGreaterThan(0);
    });
  });

  it("should have specific user-friendly messages", () => {
    // Arrange & Act & Assert
    expect(ERROR_CODES.recaptcha_verification_failed).toBe(
      "reCAPTCHA validation failed.",
    );
    expect(ERROR_CODES.form_not_found).toBe(
      "The form you are trying to access does not exist.",
    );
    expect(ERROR_CODES.submission_token_invalid).toBe(
      "Your submission session has expired.",
    );
    expect(ERROR_CODES.network_error).toBe(
      "Network connection failed. Please check your internet connection.",
    );
    expect(ERROR_CODES.authentication_required).toBe(
      "Authentication is required to access this resource.",
    );
    expect(ERROR_CODES.access_forbidden).toBe(
      "You don't have permission to access this resource.",
    );
    expect(ERROR_CODES.resource_not_found).toBe(
      "The requested resource was not found.",
    );
    expect(ERROR_CODES.rate_limit_exceeded).toBe(
      "Too many requests. Please try again later.",
    );
    expect(ERROR_CODES.server_error).toBe(
      "Server error occurred. Please try again later.",
    );
    expect(ERROR_CODES.validation_error).toBe("The provided data is invalid.");
    expect(ERROR_CODES.json_parse_error).toBe(
      "Failed to parse server response.",
    );
    expect(ERROR_CODES.unknown_error).toBe("An unknown error occurred.");
  });

  it("should be immutable", () => {
    // Arrange
    const originalMessage = ERROR_CODES.form_not_found;

    // Act
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ERROR_CODES as any).form_not_found = "Modified message";
    } catch {
      // Expected in strict mode
    }

    // Assert
    expect(ERROR_CODES.form_not_found).toBe(originalMessage);
  });
});

describe("ERROR_CODE", () => {
  it("should have correct string values for all error codes", () => {
    // Arrange & Act & Assert
    expect(ERROR_CODE.RECAPTCHA_VERIFICATION_FAILED).toBe(
      "recaptcha_verification_failed",
    );
    expect(ERROR_CODE.FORM_NOT_FOUND).toBe("form_not_found");
    expect(ERROR_CODE.SUBMISSION_TOKEN_INVALID).toBe(
      "submission_token_invalid",
    );
    expect(ERROR_CODE.NETWORK_ERROR).toBe("network_error");
    expect(ERROR_CODE.AUTHENTICATION_REQUIRED).toBe("authentication_required");
    expect(ERROR_CODE.ACCESS_FORBIDDEN).toBe("access_forbidden");
    expect(ERROR_CODE.RESOURCE_NOT_FOUND).toBe("resource_not_found");
    expect(ERROR_CODE.RATE_LIMIT_EXCEEDED).toBe("rate_limit_exceeded");
    expect(ERROR_CODE.SERVER_ERROR).toBe("server_error");
    expect(ERROR_CODE.VALIDATION_ERROR).toBe("validation_error");
    expect(ERROR_CODE.JSON_PARSE_ERROR).toBe("json_parse_error");
    expect(ERROR_CODE.UNKNOWN_ERROR).toBe("unknown_error");
  });

  it("should have all ERROR_CODE values present in ERROR_CODES", () => {
    // Arrange
    const errorCodeValues = Object.values(ERROR_CODE);

    // Act & Assert
    errorCodeValues.forEach((code) => {
      expect(ERROR_CODES[code as ErrorCode]).toBeDefined();
    });
  });

  it("should be immutable (readonly)", () => {
    // Arrange
    const originalValue = ERROR_CODE.FORM_NOT_FOUND;

    // Act
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ERROR_CODE as any).FORM_NOT_FOUND = "modified_value";
    } catch {
      // Expected in strict mode
    }

    // Assert
    expect(ERROR_CODE.FORM_NOT_FOUND).toBe(originalValue);
  });
});

describe("DEFAULT_ERROR_MESSAGE", () => {
  it("should have a meaningful default message", () => {
    // Arrange & Act & Assert
    expect(DEFAULT_ERROR_MESSAGE).toBe("An unexpected error occurred.");
    expect(typeof DEFAULT_ERROR_MESSAGE).toBe("string");
    expect(DEFAULT_ERROR_MESSAGE.length).toBeGreaterThan(0);
  });

  it("should be a constant string value", () => {
    // Arrange & Act & Assert
    // Strings are immutable primitives in JavaScript
    // Testing that it maintains its expected value
    expect(DEFAULT_ERROR_MESSAGE).toBe("An unexpected error occurred.");
    expect(typeof DEFAULT_ERROR_MESSAGE).toBe("string");
  });
});

describe("getErrorMessage", () => {
  it("should return the correct message for known error codes", () => {
    // Arrange
    const testCases = [
      {
        code: "recaptcha_verification_failed",
        expected: ERROR_CODES.recaptcha_verification_failed,
      },
      { code: "form_not_found", expected: ERROR_CODES.form_not_found },
      {
        code: "submission_token_invalid",
        expected: ERROR_CODES.submission_token_invalid,
      },
      { code: "network_error", expected: ERROR_CODES.network_error },
      {
        code: "authentication_required",
        expected: ERROR_CODES.authentication_required,
      },
      { code: "access_forbidden", expected: ERROR_CODES.access_forbidden },
      { code: "resource_not_found", expected: ERROR_CODES.resource_not_found },
      {
        code: "rate_limit_exceeded",
        expected: ERROR_CODES.rate_limit_exceeded,
      },
      { code: "server_error", expected: ERROR_CODES.server_error },
      { code: "validation_error", expected: ERROR_CODES.validation_error },
      { code: "json_parse_error", expected: ERROR_CODES.json_parse_error },
      { code: "unknown_error", expected: ERROR_CODES.unknown_error },
    ];

    // Act & Assert
    testCases.forEach(({ code, expected }) => {
      const result = getErrorMessage(code);
      expect(result).toBe(expected);
    });
  });

  it("should return null for unknown error codes", () => {
    // Arrange
    const unknownCodes = [
      "unknown_code",
      "invalid_error",
      "does_not_exist",
      "random_string",
    ];

    // Act & Assert
    unknownCodes.forEach((code) => {
      const result = getErrorMessage(code);
      expect(result).toBeNull();
    });
  });

  it("should return null for undefined input", () => {
    // Arrange
    const input = undefined;

    // Act
    const result = getErrorMessage(input);

    // Assert
    expect(result).toBeNull();
  });

  it("should return null for null input", () => {
    // Arrange
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = null as any;

    // Act
    const result = getErrorMessage(input);

    // Assert
    expect(result).toBeNull();
  });

  it("should return null for empty string input", () => {
    // Arrange
    const input = "";

    // Act
    const result = getErrorMessage(input);

    // Assert
    expect(result).toBeNull();
  });
});

describe("getErrorMessageWithFallback", () => {
  it("should return the correct message for known error codes", () => {
    // Arrange
    const errorCode = "recaptcha_verification_failed";
    const fallback = "Custom fallback message";

    // Act
    const result = getErrorMessageWithFallback(errorCode, fallback);

    // Assert
    expect(result).toBe(ERROR_CODES.recaptcha_verification_failed);
    expect(result).not.toBe(fallback);
  });

  it("should return custom fallback message for unknown error codes", () => {
    // Arrange
    const errorCode = "unknown_code";
    const fallback = "Custom fallback message";

    // Act
    const result = getErrorMessageWithFallback(errorCode, fallback);

    // Assert
    expect(result).toBe(fallback);
  });

  it("should return default message when no fallback is provided for unknown codes", () => {
    // Arrange
    const errorCode = "unknown_code";

    // Act
    const result = getErrorMessageWithFallback(errorCode);

    // Assert
    expect(result).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it("should return default message for undefined error code with no fallback", () => {
    // Arrange
    const errorCode = undefined;

    // Act
    const result = getErrorMessageWithFallback(errorCode);

    // Assert
    expect(result).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it("should return custom fallback for undefined error code with fallback", () => {
    // Arrange
    const errorCode = undefined;
    const fallback = "Custom fallback for undefined";

    // Act
    const result = getErrorMessageWithFallback(errorCode, fallback);

    // Assert
    expect(result).toBe(fallback);
  });

  it("should return default message for null error code with no fallback", () => {
    // Arrange
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorCode = null as any;

    // Act
    const result = getErrorMessageWithFallback(errorCode);

    // Assert
    expect(result).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it("should return default message for empty string error code with no fallback", () => {
    // Arrange
    const errorCode = "";

    // Act
    const result = getErrorMessageWithFallback(errorCode);

    // Assert
    expect(result).toBe(DEFAULT_ERROR_MESSAGE);
  });
});

describe("isKnownErrorCode", () => {
  it("should return true for all known error codes", () => {
    // Arrange
    const knownCodes = Object.values(ERROR_CODE);

    // Act & Assert
    knownCodes.forEach((code) => {
      const result = isKnownErrorCode(code);
      expect(result).toBe(true);
    });
  });

  it("should return false for unknown error codes", () => {
    // Arrange
    const unknownCodes = [
      "unknown_code",
      "invalid_error",
      "does_not_exist",
      "random_string",
      "not_a_real_code",
    ];

    // Act & Assert
    unknownCodes.forEach((code) => {
      const result = isKnownErrorCode(code);
      expect(result).toBe(false);
    });
  });

  it("should return false for undefined input", () => {
    // Arrange
    const input = undefined;

    // Act
    const result = isKnownErrorCode(input);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false for null input", () => {
    // Arrange
    const input = null as unknown as string;

    // Act
    const result = isKnownErrorCode(input);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false for empty string input", () => {
    // Arrange
    const input = "";

    // Act
    const result = isKnownErrorCode(input);

    // Assert
    expect(result).toBe(false);
  });

  it("should be case sensitive", () => {
    // Arrange
    const correctCode = "form_not_found";
    const upperCaseCode = "FORM_NOT_FOUND";
    const mixedCaseCode = "Form_Not_Found";

    // Act & Assert
    expect(isKnownErrorCode(correctCode)).toBe(true);
    expect(isKnownErrorCode(upperCaseCode)).toBe(false);
    expect(isKnownErrorCode(mixedCaseCode)).toBe(false);
  });
});

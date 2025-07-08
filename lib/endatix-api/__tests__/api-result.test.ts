import { describe, expect, it } from "vitest";
import {
  ApiResult,
  ApiErrorType,
  isNetworkError,
  isAuthError,
  isValidationError,
  isServerError,
  isNotFoundError,
  isRateLimitError,
  hasErrorCode,
  isRecaptchaError,
  isTokenInvalidError,
  isFormNotFoundError,
  ERROR_CODE,
} from "../shared/api-result";
import { fail } from "assert";

describe("ApiResult", () => {
  describe("success factory", () => {
    it("should create a successful result with data", () => {
      // Arrange
      const data = { id: 1, name: "Test" };

      // Act
      const result = ApiResult.success(data);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it("should create a successful result with null data", () => {
      // Arrange
      const data = null;

      // Act
      const result = ApiResult.success(data);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });

    it("should create a successful result with undefined data", () => {
      // Arrange
      const data = undefined;

      // Act
      const result = ApiResult.success(data);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(undefined);
    });
  });

  describe("error factories", () => {
    describe("networkError", () => {
      it("should create a network error with default message", () => {
        // Arrange
        // (no setup needed for default case)

        // Act
        const result = ApiResult.networkError();

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.NetworkError);
        expect(result.error.message).toBeTruthy();
        expect(result.error.errorCode).toBe(ERROR_CODE.NETWORK_ERROR);
      });

      it("should create a network error with custom message and details", () => {
        // Arrange
        const customMessage = "Custom network error";
        const customDetails = { statusCode: 503, endpoint: "/api/test" };

        // Act
        const result = ApiResult.networkError(customMessage, customDetails);

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.NetworkError);
        expect(result.error.message).toBe(customMessage);
        expect(result.error.details?.statusCode).toBe(503);
        expect(result.error.details?.endpoint).toBe("/api/test");
      });
    });

    describe("authError", () => {
      it("should create an auth error with default message", () => {
        // Arrange
        // (no setup needed for default case)
        
        // Act
        const result = ApiResult.authError();

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.AuthError);
        expect(result.error.message).toBeTruthy();
        expect(result.error.errorCode).toBe(
          ERROR_CODE.AUTHENTICATION_REQUIRED,
        );
      });

      it("should create an auth error with custom message and details", () => {
        // Arrange
        const customMessage = "Unauthorized access";
        const customDetails = {
          statusCode: 401,
        };

        // Act
        const result = ApiResult.authError(customMessage, ERROR_CODE.ACCESS_FORBIDDEN, customDetails);

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.AuthError);
        expect(result.error.message).toBe(customMessage);
        expect(result.error.errorCode).toBe(ERROR_CODE.ACCESS_FORBIDDEN);
      });
    });

    describe("validationError", () => {
      it("should create a validation error with default message", () => {
        // Arrange
        // (no setup needed for default case)

        // Act
        const result = ApiResult.validationError();

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.ValidationError);
        expect(result.error.message).toBeTruthy();
        expect(result.error.errorCode).toBe(
          ERROR_CODE.VALIDATION_ERROR,
        );
      });

      it("should create a validation error with custom message and details", () => {
        // Arrange
        const customMessage = "Invalid input data";
        const customDetails = {
          statusCode: 400,
          details: "Field validation failed",
        };

        // Act
        const result = ApiResult.validationError(customMessage, undefined, customDetails);

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.ValidationError);
        expect(result.error.message).toBe(customMessage);
        expect(result.error.details?.details).toBe("Field validation failed");
      });
    });

    describe("serverError", () => {
      it("should create a server error with default message", () => {
        // Arrange
        // (no setup needed for default case)

        // Act
        const result = ApiResult.serverError();

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.ServerError);
        expect(result.error.message).toBeTruthy();
        expect(result.error.errorCode).toBe(ERROR_CODE.SERVER_ERROR);
      });

      it("should create a server error with custom message and details", () => {
        // Arrange
        const customMessage = "Internal server error";
        const customDetails = { statusCode: 500, method: "POST" };

        // Act
        const result = ApiResult.serverError(customMessage, customDetails);

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.ServerError);
        expect(result.error.message).toBe(customMessage);
        expect(result.error.details?.method).toBe("POST");
      });
    });

    describe("notFoundError", () => {
      it("should create a not found error with default message", () => {
        // Arrange
        // (no setup needed for default case)

        // Act
        const result = ApiResult.notFoundError();

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.NotFoundError);
        expect(result.error.message).toBeTruthy();
        expect(result.error.errorCode).toBe(
          ERROR_CODE.RESOURCE_NOT_FOUND,
        );
      });

      it("should create a not found error with custom message and details", () => {
        // Arrange
        const customMessage = "Resource not found";
        const customDetails = { statusCode: 404, endpoint: "/api/forms/123" };

        // Act
        const result = ApiResult.notFoundError(customMessage, customDetails);

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }
        expect(result.error.type).toBe(ApiErrorType.NotFoundError);
        expect(result.error.message).toBe(customMessage);
        expect(result.error.details?.endpoint).toBe("/api/forms/123");
      });
    });

    describe("rateLimitError", () => {
      it("should create a rate limit error with default message", () => {
        // Arrange
        // (no setup needed for default case)

        // Act
        const result = ApiResult.rateLimitError();

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.RateLimitError);
        expect(result.error.message).toBeTruthy();
        expect(result.error.errorCode).toBe(
          ERROR_CODE.RATE_LIMIT_EXCEEDED,
        );
      });

      it("should create a rate limit error with custom message and details", () => {
        // Arrange
        const customMessage = "Rate limit exceeded";
        const customDetails = { statusCode: 429, retryAfter: 60 };

        // Act
        const result = ApiResult.rateLimitError(customMessage, customDetails);

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.RateLimitError);
        expect(result.error.message).toBe(customMessage);
        expect(result.error.details?.retryAfter).toBe(60);
      });
    });

    describe("jsonParseError", () => {
      it("should create a JSON parse error with default message", () => {
        // Arrange
        // (no setup needed for default case)

        // Act
        const result = ApiResult.jsonParseError();

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.JsonParseError);
        expect(result.error.message).toBeTruthy();
        expect(result.error.errorCode).toBe(
          ERROR_CODE.JSON_PARSE_ERROR,
        );
      });

      it("should create a JSON parse error with custom message and details", () => {
        // Arrange
        const customMessage = "Invalid JSON response";
        const customDetails = { statusCode: 500, details: "Malformed JSON" };

        // Act
        const result = ApiResult.jsonParseError(customMessage, customDetails);

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.JsonParseError);
        expect(result.error.message).toBe(customMessage);
        expect(result.error.details?.details).toBe("Malformed JSON");
      });
    });

    describe("unknownError", () => {
      it("should create an unknown error with default message", () => {
        // Arrange
        // (no setup needed for default case)

        // Act
        const result = ApiResult.unknownError();

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.UnknownError);
        expect(result.error.message).toBeTruthy();
        expect(result.error.errorCode).toBe(ERROR_CODE.UNKNOWN_ERROR);
      });

      it("should create an unknown error with custom message and details", () => {
        // Arrange
        const customMessage = "Something went wrong";
        const customDetails = { statusCode: 500, details: "Unexpected error" };

        // Act
        const result = ApiResult.unknownError(customMessage, customDetails);

        // Assert
        expect(result.success).toBe(false);
        if (result.success) {
          fail("Result is not an error");
        }

        expect(result.error.type).toBe(ApiErrorType.UnknownError);
        expect(result.error.message).toBe(customMessage);
        expect(result.error.details?.details).toBe("Unexpected error");
      });
    });
  });

  describe("helper functions", () => {
    describe("isSuccess", () => {
      it("should return true for successful results", () => {
        // Arrange
        const result = ApiResult.success({ data: "test" });

        // Act
        const isSuccess = ApiResult.isSuccess(result);

        // Assert
        expect(isSuccess).toBe(true);
      });

      it("should return false for error results", () => {
        // Arrange
        const result = ApiResult.networkError();

        // Act
        const isSuccess = ApiResult.isSuccess(result);

        // Assert
        expect(isSuccess).toBe(false);
      });
    });

    describe("isError", () => {
      it("should return false for successful results", () => {
        // Arrange
        const result = ApiResult.success({ data: "test" });

        // Act
        const isError = ApiResult.isError(result);

        // Assert
        expect(isError).toBe(false);
      });

      it("should return true for error results", () => {
        // Arrange
        const result = ApiResult.networkError();

        // Act
        const isError = ApiResult.isError(result);

        // Assert
        expect(isError).toBe(true);
      });
    });

    describe("getErrorType", () => {
      it("should return null for successful results", () => {
        // Arrange
        const result = ApiResult.success({ data: "test" });

        // Act
        const errorType = ApiResult.getErrorType(result);

        // Assert
        expect(errorType).toBe(null);
      });

      it("should return the error type for error results", () => {
        // Arrange
        const result = ApiResult.networkError();

        // Act
        const errorType = ApiResult.getErrorType(result);

        // Assert
        expect(errorType).toBe(ApiErrorType.NetworkError);
      });
    });

    describe("getErrorDetails", () => {
      it("should return null for successful results", () => {
        // Arrange
        const result = ApiResult.success({ data: "test" });

        // Act
        const errorDetails = ApiResult.getErrorDetails(result);

        // Assert
        expect(errorDetails).toBe(null);
      });

      it("should return error details for error results", () => {
        // Arrange
        const details = { statusCode: 500, endpoint: "/api/test" };
        const result = ApiResult.serverError("Test error", details);

        // Act
        const errorDetails = ApiResult.getErrorDetails(result);

        // Assert
        expect(errorDetails).toEqual(expect.objectContaining(details));
      });

      it("should return details when no details are provided", () => {
        // Arrange
        const result = ApiResult.serverError("Test error");

        // Act
        const errorDetails = ApiResult.getErrorDetails(result);

        // Assert
        expect(errorDetails).toBeDefined();
      });
    });

    describe("getErrorMessage", () => {
      it("should return null for successful results", () => {
        // Arrange
        const result = ApiResult.success({ data: "test" });

        // Act
        const errorMessage = ApiResult.getErrorMessage(result);

        // Assert
        expect(errorMessage).toBe(null);
      });

      it("should return the error message for error results", () => {
        // Arrange
        const message = "Custom error message";
        const result = ApiResult.serverError(message);

        // Act
        const errorMessage = ApiResult.getErrorMessage(result);

        // Assert
        expect(errorMessage).toBe(message);
      });
    });

    describe("getErrorCode", () => {
      it("should return null for successful results", () => {
        // Arrange
        const result = ApiResult.success({ data: "test" });

        // Act
        const errorCode = ApiResult.getErrorCode(result);

        // Assert
        expect(errorCode).toBe(null);
      });

      it("should return the error code for error results", () => {
        // Arrange
        const result = ApiResult.serverError();

        // Act
        const errorCode = ApiResult.getErrorCode(result);

        // Assert
        expect(errorCode).toBe(ERROR_CODE.SERVER_ERROR);
      });

      it("should return default error code when no error code is provided", () => {
        // Arrange
        const result = ApiResult.serverError("Test error", {});

        // Act
        const errorCode = ApiResult.getErrorCode(result);

        // Assert
        expect(errorCode).toBe(ERROR_CODE.SERVER_ERROR);
      });
    });

    describe("getUserFriendlyMessage", () => {
      it("should return null for successful results", () => {
        // Arrange
        const result = ApiResult.success({ data: "test" });

        // Act
        const userFriendlyMessage = ApiResult.getUserFriendlyMessage(result);

        // Assert
        expect(userFriendlyMessage).toBe(null);
      });

      it("should return provided message when provided for known error codes", () => {
        // Arrange
        const providedMessage = "Provided error message";
        const result = ApiResult.serverError(providedMessage);

        // Act
        const userFriendlyMessage = ApiResult.getUserFriendlyMessage(result);

        // Assert
        expect(userFriendlyMessage).toBeTruthy();
        expect(userFriendlyMessage).toBe(providedMessage);
      });

      it("should return provided message when provided for unknown error codes", () => {
        // Arrange
        const providedMessage = "Provided error message";
        const result = ApiResult.unknownError(providedMessage);

        // Act
        const userFriendlyMessage = ApiResult.getUserFriendlyMessage(result);

        // Assert
        expect(userFriendlyMessage).toBeTruthy();
        expect(userFriendlyMessage).toBe(providedMessage);
      });
    });
  });

  describe("type guard functions", () => {
    it("should correctly identify network errors", () => {
      // Arrange
      const networkError = ApiResult.networkError();
      const authError = ApiResult.authError();
      const success = ApiResult.success({ data: "test" });

      // Act & Assert
      expect(isNetworkError(networkError)).toBe(true);
      expect(isNetworkError(authError)).toBe(false);
      expect(isNetworkError(success)).toBe(false);
    });

    it("should correctly identify auth errors", () => {
      // Arrange
      const authError = ApiResult.authError();
      const networkError = ApiResult.networkError();
      const success = ApiResult.success({ data: "test" });

      // Act & Assert
      expect(isAuthError(authError)).toBe(true);
      expect(isAuthError(networkError)).toBe(false);
      expect(isAuthError(success)).toBe(false);
    });

    it("should correctly identify validation errors", () => {
      // Arrange
      const validationError = ApiResult.validationError();
      const networkError = ApiResult.networkError();
      const success = ApiResult.success({ data: "test" });

      // Act & Assert
      expect(isValidationError(validationError)).toBe(true);
      expect(isValidationError(networkError)).toBe(false);
      expect(isValidationError(success)).toBe(false);
    });

    it("should correctly identify server errors", () => {
      // Arrange
      const serverError = ApiResult.serverError();
      const networkError = ApiResult.networkError();
      const success = ApiResult.success({ data: "test" });

      // Act & Assert
      expect(isServerError(serverError)).toBe(true);
      expect(isServerError(networkError)).toBe(false);
      expect(isServerError(success)).toBe(false);
    });

    it("should correctly identify not found errors", () => {
      // Arrange
      const notFoundError = ApiResult.notFoundError();
      const networkError = ApiResult.networkError();
      const success = ApiResult.success({ data: "test" });

      // Act & Assert
      expect(isNotFoundError(notFoundError)).toBe(true);
      expect(isNotFoundError(networkError)).toBe(false);
      expect(isNotFoundError(success)).toBe(false);
    });

    it("should correctly identify rate limit errors", () => {
      // Arrange
      const rateLimitError = ApiResult.rateLimitError();
      const networkError = ApiResult.networkError();
      const success = ApiResult.success({ data: "test" });

      // Act & Assert
      expect(isRateLimitError(rateLimitError)).toBe(true);
      expect(isRateLimitError(networkError)).toBe(false);
      expect(isRateLimitError(success)).toBe(false);
    });
  });

  describe("error code helpers", () => {
    describe("hasErrorCode", () => {
      it("should return true when error has the specified error code", () => {
        // Arrange
        // Create result with specific errorCode manually to test hasErrorCode
        const result = {
          success: false,
          error: {
            type: ApiErrorType.ValidationError,
            message: "Test",
            errorCode: ERROR_CODE.RECAPTCHA_VERIFICATION_FAILED,
          },
        } as const;

        // Act
        const hasSpecificErrorCode = hasErrorCode(
          result,
          ERROR_CODE.RECAPTCHA_VERIFICATION_FAILED,
        );

        // Assert
        expect(hasSpecificErrorCode).toBe(true);
      });

      it("should return false when error has a different error code", () => {
        // Arrange
        const result = ApiResult.validationError("Test");

        // Act
        const hasSpecificErrorCode = hasErrorCode(
          result,
          ERROR_CODE.RECAPTCHA_VERIFICATION_FAILED,
        );

        // Assert
        expect(hasSpecificErrorCode).toBe(false);
      });

      it("should return false for successful results", () => {
        // Arrange
        const result = ApiResult.success({ data: "test" });

        // Act
        const hasSpecificErrorCode = hasErrorCode(
          result,
          ERROR_CODE.RECAPTCHA_VERIFICATION_FAILED,
        );

        // Assert
        expect(hasSpecificErrorCode).toBe(false);
      });
    });

    describe("isRecaptchaError", () => {
      it("should return true for recaptcha verification errors", () => {
        // Arrange
        // Create result with specific errorCode manually to test isRecaptchaError
        const result = {
          success: false,
          error: {
            type: ApiErrorType.ValidationError,
            message: "Test",
            errorCode: ERROR_CODE.RECAPTCHA_VERIFICATION_FAILED,
          },
        } as const;

        // Act
        const isRecaptchaErr = isRecaptchaError(result);

        // Assert
        expect(isRecaptchaErr).toBe(true);
      });

      it("should return false for other errors", () => {
        // Arrange
        const result = ApiResult.validationError("Test");

        // Act
        const isRecaptchaErr = isRecaptchaError(result);

        // Assert
        expect(isRecaptchaErr).toBe(false);
      });

      it("should return false for successful results", () => {
        // Arrange
        const result = ApiResult.success({ data: "test" });

        // Act
        const isRecaptchaErr = isRecaptchaError(result);

        // Assert
        expect(isRecaptchaErr).toBe(false);
      });
    });

    describe("isTokenInvalidError", () => {
      it("should return true for invalid token errors", () => {
        // Arrange
        // Create result with specific errorCode manually to test isTokenInvalidError
        const result = {
          success: false,
          error: {
            type: ApiErrorType.AuthError,
            message: "Test",
            errorCode: ERROR_CODE.SUBMISSION_TOKEN_INVALID,
          },
        } as const;

        // Act
        const isTokenInvalid = isTokenInvalidError(result);

        // Assert
        expect(isTokenInvalid).toBe(true);
      });

      it("should return false for other errors", () => {
        // Arrange
        const result = ApiResult.authError("Test");

        // Act
        const isTokenInvalid = isTokenInvalidError(result);

        // Assert
        expect(isTokenInvalid).toBe(false);
      });

      it("should return false for successful results", () => {
        // Arrange
        const result = ApiResult.success({ data: "test" });

        // Act
        const isTokenInvalid = isTokenInvalidError(result);

        // Assert
        expect(isTokenInvalid).toBe(false);
      });
    });

    describe("isFormNotFoundError", () => {
      it("should return true for form not found errors", () => {
        // Arrange
        // Create result with specific errorCode manually to test isFormNotFoundError
        const result = {
          success: false,
          error: {
            type: ApiErrorType.NotFoundError,
            message: "Test",
            errorCode: ERROR_CODE.FORM_NOT_FOUND,
          },
        } as const;

        // Act
        const isFormNotFound = isFormNotFoundError(result);

        // Assert
        expect(isFormNotFound).toBe(true);
      });

      it("should return false for other errors", () => {
        // Arrange
        const result = ApiResult.notFoundError("Test");

        // Act
        const isFormNotFound = isFormNotFoundError(result);

        // Assert
        expect(isFormNotFound).toBe(false);
      });

      it("should return false for successful results", () => {
        // Arrange
        const result = ApiResult.success({ data: "test" });

        // Act
        const isFormNotFound = isFormNotFoundError(result);

        // Assert
        expect(isFormNotFound).toBe(false);
      });
    });
  });
});

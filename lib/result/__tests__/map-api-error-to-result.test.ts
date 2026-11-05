import { describe, expect, it } from "vitest";
import { ApiErrorType, type ApiError } from "@/lib/endatix-api";
import { ErrorType, Kind } from "@/lib/result";
import { mapApiErrorToResult } from "@/lib/result/map-api-error-to-result";

describe("mapApiErrorToResult", () => {
  it("copies ProblemDetails traceId and status onto Result", () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        type: ApiErrorType.ValidationError,
        message: "We have a problem",
        errorCode: "ValidationError",
        details: {
          statusCode: 400,
          details: "We have a problem",
          endpoint: "/api/forms",
          method: "GET",
          traceId: "00-7c4136e87655d6da47ee643c221f630b-ef3c8ae2be5da5dd-00",
        },
      },
    };

    // Act
    const result = mapApiErrorToResult(apiError);

    // Assert
    expect(result.kind).toBeDefined();
    expect(result).toMatchObject({
      errorType: ErrorType.ValidationError,
      message: "We have a problem",
      errorCode: "ValidationError",
      traceId: "00-7c4136e87655d6da47ee643c221f630b-ef3c8ae2be5da5dd-00",
      statusCode: 400,
    });
  });

  it("copies support fields for non-validation ApiErrors", () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        type: ApiErrorType.ServerError,
        message: "Boom",
        details: {
          statusCode: 500,
          traceId: "00-abc-def-01",
        },
      },
    };

    // Act
    const result = mapApiErrorToResult(apiError, {
      fallbackMessage: "Failed",
    });

    // Assert
    expect(result).toMatchObject({
      errorType: ErrorType.Error,
      message: "Boom",
      traceId: "00-abc-def-01",
      statusCode: 500,
    });
  });

  it("returns validation error using preferred field message", () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        type: ApiErrorType.ValidationError,
        message: "One or more errors occurred!",
        errorCode: "data_list_name_already_exists",
        fields: {
          slug: ["slug must be a valid URL slug."],
        },
      },
    };

    // Act
    const result = mapApiErrorToResult(apiError, {
      preferredFields: ["slug", "name"],
      fallbackMessage: "Failed to create folder",
    });

    // Assert
    expect(result.kind).toBe(Kind.Error);
    if (result.kind !== Kind.Error) {
      return;
    }
    expect(result.errorType).toBe(ErrorType.ValidationError);
    expect(result.message).toBe("slug must be a valid URL slug.");
    expect(result.errorCode).toBe("data_list_name_already_exists");
  });

  it("falls back to top-level message for non-validation errors", () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        type: ApiErrorType.ServerError,
        message: "Server exploded",
        errorCode: "server_error",
      },
    };

    // Act
    const result = mapApiErrorToResult(apiError, {
      fallbackMessage: "Fallback message",
    });

    // Assert
    expect(result.kind).toBe(Kind.Error);
    if (result.kind !== Kind.Error) {
      return;
    }
    expect(result.errorType).toBe(ErrorType.Error);
    expect(result.message).toBe("Server exploded");
    expect(result.errorCode).toBe("server_error");
  });
});

describe("mapApiErrorToResult existingId", () => {
  it("copies the id a 409 names onto Result", () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        type: ApiErrorType.ConflictError,
        message: "A submission already exists for this user and form.",
        errorCode: "submission_exists",
        details: { statusCode: 409, existingId: "42" },
      },
    };

    // Act
    const result = mapApiErrorToResult(apiError);

    // Assert
    expect(result).toMatchObject({ statusCode: 409, existingId: "42" });
  });
});

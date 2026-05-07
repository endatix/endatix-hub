import { describe, expect, it } from "vitest";
import {
  ApiErrorType,
  type ApiError,
} from "@/lib/endatix-api/shared/api-result";
import { ErrorType, Kind } from "@/lib/result";
import { mapApiErrorToResult } from "@/lib/result/map-api-error-to-result";

describe("mapApiErrorToResult", () => {
  it("returns validation error using preferred field message", () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        type: ApiErrorType.ValidationError,
        message: "One or more errors occurred!",
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
  });

  it("falls back to top-level message for non-validation errors", () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        type: ApiErrorType.ServerError,
        message: "Server exploded",
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
  });
});

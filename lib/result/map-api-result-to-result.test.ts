import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  ApiErrorType,
  ApiResult,
  ERROR_CODE,
  type ApiResult as ApiResultType,
} from "@/lib/endatix-api/shared/api-result";
import { ErrorType, Kind } from "@/lib/result";
import { mapToResult } from "@/lib/result/map-api-result-to-result";

const telemetryLoggerMock = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: {
    error: telemetryLoggerMock.error,
  },
}));

describe("mapApiResultToResult", () => {
  beforeEach(() => {
    telemetryLoggerMock.error.mockClear();
  });

  it("returns a success result with projected data", () => {
    // Arrange
    const apiResult = ApiResult.success({ id: "folder-1", name: "Archive" });

    // Act
    const result = mapToResult(apiResult, {
      mapData: (folder) => folder.id,
    });

    // Assert
    expect(result.kind).toBe(Kind.Success);
    if (result.kind !== Kind.Success) {
      return;
    }
    expect(result.value).toBe("folder-1");
    expect(telemetryLoggerMock.error).not.toHaveBeenCalled();
  });

  it("returns validation errors using preferred field messages without logging", () => {
    // Arrange
    const apiResult: ApiResultType<void> = ApiResult.validationError(
      "One or more validation errors occurred.",
      ERROR_CODE.VALIDATION_ERROR,
      undefined,
      {
        slug: ["Slug is already in use."],
      },
    );

    // Act
    const result = mapToResult(apiResult, {
      fallbackMessage: "Failed to delete folder",
      preferredFields: ["slug", "name"],
      logMessage: "Failed to delete folder",
      loggerName: "folders",
    });

    // Assert
    expect(result.kind).toBe(Kind.Error);
    if (result.kind !== Kind.Error) {
      return;
    }
    expect(result.errorType).toBe(ErrorType.ValidationError);
    expect(result.message).toBe("Slug is already in use.");
    expect(result.errorCode).toBe(ERROR_CODE.VALIDATION_ERROR);
    expect(telemetryLoggerMock.error).not.toHaveBeenCalled();
  });

  it("returns non-validation errors and logs sanitized telemetry attributes", () => {
    // Arrange
    const apiResult: ApiResultType<void> = ApiResult.serverError(
      "Backend unavailable",
      {
        statusCode: 503,
        endpoint: "/api/folders/folder-1?token=secret-value#fragment",
        method: "DELETE",
        details: "token=secret-value",
        retryAfter: 30,
      },
    );

    // Act
    const result = mapToResult(apiResult, {
      fallbackMessage: "Failed to delete folder",
      logMessage: "Failed to delete folder",
      loggerName: "folders",
    });

    // Assert
    expect(result.kind).toBe(Kind.Error);
    if (result.kind !== Kind.Error) {
      return;
    }
    expect(result.errorType).toBe(ErrorType.Error);
    expect(result.message).toBe("Backend unavailable");
    expect(result.errorCode).toBe(ERROR_CODE.SERVER_ERROR);
    expect(telemetryLoggerMock.error).toHaveBeenCalledWith(
      "Failed to delete folder",
      undefined,
      expect.objectContaining({
        apiErrorType: ApiErrorType.ServerError,
        apiErrorCode: ERROR_CODE.SERVER_ERROR,
        apiErrorStatusCode: 503,
        apiErrorEndpoint: "/api/folders/folder-1",
        apiErrorMethod: "DELETE",
        apiErrorRetryAfter: 30,
      }),
      "folders",
    );

    const attributes = telemetryLoggerMock.error.mock.calls[0]?.[2];
    expect(attributes).not.toHaveProperty("apiErrorDetails");
    expect(JSON.stringify(attributes)).not.toContain("secret-value");
  });

  it("does not log expected auth or authorization errors", () => {
    // Arrange
    const apiResult: ApiResultType<void> =
      ApiResult.forbiddenError("Access denied");

    // Act
    const result = mapToResult(apiResult, {
      fallbackMessage: "Failed to delete folder",
      logMessage: "Failed to delete folder",
      loggerName: "folders",
    });

    // Assert
    expect(result.kind).toBe(Kind.Error);
    expect(telemetryLoggerMock.error).not.toHaveBeenCalled();
  });

  it("does not log expected not-found or rate-limit errors", () => {
    // Arrange
    const notFoundResult: ApiResultType<void> = ApiResult.notFoundError(
      "Folder was not found.",
    );
    const rateLimitResult: ApiResultType<void> =
      ApiResult.rateLimitError("Too many requests.");

    // Act
    const notFoundMappedResult = mapToResult(notFoundResult, {
      fallbackMessage: "Failed to delete folder",
      logMessage: "Failed to delete folder",
      loggerName: "folders",
    });
    const rateLimitMappedResult = mapToResult(rateLimitResult, {
      fallbackMessage: "Failed to delete folder",
      logMessage: "Failed to delete folder",
      loggerName: "folders",
    });

    // Assert
    expect(notFoundMappedResult.kind).toBe(Kind.Error);
    expect(rateLimitMappedResult.kind).toBe(Kind.Error);
    expect(telemetryLoggerMock.error).not.toHaveBeenCalled();
  });

  it("does not log operational errors when no log message is provided", () => {
    // Arrange
    const apiResult: ApiResultType<void> = ApiResult.networkError(
      "Network request failed",
    );

    // Act
    const result = mapToResult(apiResult, {
      fallbackMessage: "Failed to delete folder",
    });

    // Assert
    expect(result.kind).toBe(Kind.Error);
    expect(telemetryLoggerMock.error).not.toHaveBeenCalled();
  });
});

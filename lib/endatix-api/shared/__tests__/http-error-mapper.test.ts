import { describe, expect, it, vi } from "vitest";
import { ApiErrorType, ApiResult, ERROR_CODE } from "../api-result";
import { mapResponseToApiError } from "../http-error-mapper";

describe("mapResponseToApiError", () => {
  it("maps an empty 403 response to a forbidden ApiResult", async () => {
    // Arrange
    const response = new Response(null, {
      status: 403,
      statusText: "Forbidden",
    });

    // Act
    const result = await mapResponseToApiError(response, {
      statusCode: response.status,
      endpoint: "/api/forms/123",
      method: "DELETE",
    });

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      return;
    }

    expect(result.error.type).toBe(ApiErrorType.ForbiddenError);
    expect(result.error.message).toBe(
      "You don't have permission to access this resource.",
    );
    expect(result.error.errorCode).toBe(ERROR_CODE.ACCESS_FORBIDDEN);
    expect(result.error.details?.statusCode).toBe(403);
    expect(result.error.details?.endpoint).toBe("/api/forms/123");
    expect(result.error.details?.method).toBe("DELETE");
  });

  it("keeps problem details fields when a response body is available", async () => {
    // Arrange
    const response = new Response(
      JSON.stringify({
        type: "https://example.com/problems/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Name is required.",
        errorCode: ERROR_CODE.VALIDATION_ERROR,
        fields: {
          name: ["Name is required."],
        },
      }),
      {
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "application/json" },
      },
    );

    // Act
    const result = await mapResponseToApiError(response, {
      statusCode: response.status,
      endpoint: "/api/folders",
      method: "POST",
    });

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      return;
    }

    expect(result.error.type).toBe(ApiErrorType.ValidationError);
    expect(result.error.message).toBe("Name is required.");
    expect(result.error.errorCode).toBe(ERROR_CODE.VALIDATION_ERROR);
    expect(result.error.fields).toEqual({
      name: ["Name is required."],
    });
  });

  it("preserves custom problem details error codes", async () => {
    // Arrange
    const response = new Response(
      JSON.stringify({
        type: "https://example.com/problems/not-found",
        title: "Not Found",
        status: 404,
        detail: "The form no longer exists.",
        errorCode: "form_deleted",
      }),
      {
        status: 404,
        statusText: "Not Found",
        headers: { "Content-Type": "application/json" },
      },
    );

    // Act
    const result = await mapResponseToApiError(response, {
      statusCode: response.status,
      endpoint: "/api/forms/123",
      method: "DELETE",
    });

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      return;
    }

    expect(result.error.type).toBe(ApiErrorType.NotFoundError);
    expect(result.error.message).toBe("The form no longer exists.");
    expect(result.error.errorCode).toBe("form_deleted");
  });

  it("maps numeric Retry-After headers to retryAfter seconds", async () => {
    // Arrange
    const response = new Response(null, {
      status: 429,
      statusText: "Too Many Requests",
      headers: { "Retry-After": "30" },
    });

    // Act
    const result = await mapResponseToApiError(response, {
      statusCode: response.status,
      endpoint: "/api/forms",
      method: "GET",
    });

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      return;
    }

    expect(result.error.type).toBe(ApiErrorType.RateLimitError);
    expect(result.error.details?.retryAfter).toBe(30);
  });

  it("maps HTTP-date Retry-After headers to non-negative retryAfter seconds", async () => {
    // Arrange
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T11:00:00.000Z"));
    const response = new Response(null, {
      status: 429,
      statusText: "Too Many Requests",
      headers: {
        "Retry-After": "Tue, 02 Jun 2026 11:00:45 GMT",
      },
    });

    try {
      // Act
      const result = await mapResponseToApiError(response, {
        statusCode: response.status,
        endpoint: "/api/forms",
        method: "GET",
      });

      // Assert
      expect(ApiResult.isError(result)).toBe(true);
      if (ApiResult.isSuccess(result)) {
        return;
      }

      expect(result.error.type).toBe(ApiErrorType.RateLimitError);
      expect(result.error.details?.retryAfter).toBe(45);
    } finally {
      vi.useRealTimers();
    }
  });

  it("omits retryAfter for invalid Retry-After headers", async () => {
    // Arrange
    const response = new Response(null, {
      status: 429,
      statusText: "Too Many Requests",
      headers: { "Retry-After": "not-a-date" },
    });

    // Act
    const result = await mapResponseToApiError(response, {
      statusCode: response.status,
      endpoint: "/api/forms",
      method: "GET",
    });

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      return;
    }

    expect(result.error.type).toBe(ApiErrorType.RateLimitError);
    expect(result.error.details?.retryAfter).toBeUndefined();
  });
});

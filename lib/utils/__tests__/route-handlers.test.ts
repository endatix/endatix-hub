import { fail } from "assert";
import { ApiErrorType, ApiResult, ERROR_CODE } from "../../endatix-api";
import {
  apiResponses,
  parseJsonBody,
  parseOptionalJsonBody,
  setResponseCachingHeaders,
  toApiResponse,
} from "../route-handlers";
import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

describe("route-handlers", () => {
  describe("toApiResponse", () => {
    it("returns successful ApiResult data as response body", async () => {
      // Arrange
      const result = ApiResult.success({ id: "submission-1" });

      // Act
      const response = toApiResponse(result);

      // Assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ id: "submission-1" });
    });

    it("returns validation errors as problem details", async () => {
      // Arrange
      const result = ApiResult.validationError(
        "Submission data is required",
        ERROR_CODE.VALIDATION_ERROR,
        undefined,
        { submissionData: ["Required"] },
      );

      // Act
      const response = toApiResponse(result);

      // Assert
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        type: "https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.1",
        title: "Bad Request",
        detail: "The provided data is invalid.",
        status: 400,
        errorCode: ERROR_CODE.VALIDATION_ERROR,
        fields: { submissionData: ["Required"] },
      });
    });

    it.each([
      [ApiResult.authError("Missing auth"), 401, "Unauthorized"],
      [ApiResult.forbiddenError("Not allowed"), 403, "Forbidden"],
      [ApiResult.notFoundError("Missing form"), 404, "Not Found"],
      [ApiResult.rateLimitError("Slow down"), 429, "Too Many Requests"],
      [
        ApiResult.serverError("Unexpected failure"),
        500,
        "Internal Server Error",
      ],
    ])(
      "maps ApiResult error type to HTTP problem details",
      async (result, expectedStatus, expectedTitle) => {
        // Act
        const response = toApiResponse(result);
        const body = await response.json();

        // Assert
        expect(response.status).toBe(expectedStatus);
        expect(body.status).toBe(expectedStatus);
        expect(body.title).toBe(expectedTitle);
        if (!ApiResult.isError(result)) {
          fail("Expected ApiResult to be an error");
        }
        expect(body.errorCode).toBe(result.error.errorCode);
      },
    );

    it("uses explicit ApiResult status details when present", async () => {
      // Arrange
      const result = ApiResult.unknownError("Bad gateway", {
        statusCode: 502,
      });

      // Act
      const response = toApiResponse(result);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(502);
      expect(body.status).toBe(502);
      expect(body.title).toBe("502 Error");
      expect(body.type).toBe("https://httpstatuses.com/502");
    });
  });

  describe("apiResponses", () => {
    it("creates bad request problem details with caller provided fields", async () => {
      // Act
      const response = apiResponses.badRequest({
        detail: "Invalid JSON body",
        fields: { body: ["Malformed"] },
      });

      // Assert
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        type: "https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.1",
        title: "Bad Request",
        detail: "Invalid JSON body",
        status: 400,
        fields: { body: ["Malformed"] },
      });
    });

    it("falls back to the default problem detail when caller detail is empty", async () => {
      // Act
      const response = apiResponses.notFound({ detail: "" });

      // Assert
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({
        title: "Not Found",
        detail: "Not Found",
        status: 404,
      });
    });
  });

  describe("parseJsonBody", () => {
    it("returns parsed JSON body", async () => {
      // Arrange
      const request = new Request("http://localhost/test", {
        method: "POST",
        body: JSON.stringify({ formId: "form-1" }),
      });

      // Act
      const result = await parseJsonBody<{ formId: string }>(request);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ formId: "form-1" });
      }
    });

    it("returns bad request response for invalid JSON", async () => {
      // Arrange
      const request = new Request("http://localhost/test", {
        method: "POST",
        body: "{",
      });

      // Act
      const result = await parseJsonBody(request);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
        expect(await result.error.json()).toMatchObject({
          title: "Bad Request",
          detail: "Invalid JSON body",
          status: 400,
        });
      }
    });

    it("supports custom invalid JSON detail", async () => {
      // Arrange
      const request = new Request("http://localhost/test", {
        method: "POST",
        body: "{",
      });

      // Act
      const result = await parseJsonBody(request, {
        invalidDetail: "Body must be valid JSON",
      });

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(await result.error.json()).toMatchObject({
          detail: "Body must be valid JSON",
        });
      }
    });
  });

  describe("parseOptionalJsonBody", () => {
    it("returns default value for an empty body", async () => {
      // Arrange
      const request = new Request("http://localhost/test", {
        method: "POST",
      });

      // Act
      const result = await parseOptionalJsonBody(request, { token: undefined });

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ token: undefined });
      }
    });

    it("returns parsed JSON when body is present", async () => {
      // Arrange
      const request = new Request("http://localhost/test", {
        method: "POST",
        body: JSON.stringify({ token: "abc" }),
      });

      // Act
      const result = await parseOptionalJsonBody(request, {});

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ token: "abc" });
      }
    });
  });

  describe("setResponseCachingHeaders", () => {
    it("sets browser-only cache headers by default", () => {
      // Arrange
      const response = NextResponse.json({});

      // Act
      setResponseCachingHeaders(response, {});

      // Assert
      expect(response.headers.get("Cache-Control")).toBe(
        "private, max-age=0, must-revalidate",
      );
      expect(response.headers.get("Pragma")).toBe("no-cache");
      expect(response.headers.get("Vary")).toBe("Cookie");
    });

    it("sets no-store cache headers and etag when requested", () => {
      // Arrange
      const response = NextResponse.json({});

      // Act
      setResponseCachingHeaders(response, {
        storeMode: "noStore",
        etag: "etag-1",
      });

      // Assert
      expect(response.headers.get("Cache-Control")).toBe(
        "no-store, no-cache, must-revalidate",
      );
      expect(response.headers.get("ETag")).toBe('"etag-1"');
    });
  });
});

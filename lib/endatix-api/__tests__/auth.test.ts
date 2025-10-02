import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { EndatixApi } from "../endatix-api";
import Auth from "../auth/auth";
import { ApiResult, ApiErrorType, ERROR_CODE } from "../shared/api-result";
import type { SignInRequest, SignInResponse } from "../auth/types";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Auth", () => {
  let endatixApi: EndatixApi;
  let auth: Auth;

  beforeEach(() => {
    process.env.ENDATIX_API_URL = "https://ci.api.endatix.com/api";
    endatixApi = new EndatixApi();
    auth = endatixApi.auth;
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    const validSignInRequest: SignInRequest = {
      email: "test@example.com",
      password: "validPassword123",
    };

    describe("validation error responses", () => {
      it("should handle FluentValidation error response", async () => {
        // Arrange
        const serverErrorResponse = {
          statusCode: 400,
          message: "One or more errors occurred!",
          errors: {
            password: ["password is too short!"],
          },
        };

        const mockResponse = new Response(JSON.stringify(serverErrorResponse), {
          status: 400,
          statusText: "Bad Request",
          headers: { "Content-Type": "application/json" },
        });

        mockFetch.mockResolvedValueOnce(mockResponse);

        // Act
        const result = await auth.signIn(validSignInRequest);

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/auth/login"),
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify(validSignInRequest),
          }),
        );

        expect(ApiResult.isError(result)).toBe(true);
        if (ApiResult.isError(result)) {
          expect(result.error.type).toBe(ApiErrorType.ValidationError);
          expect(result.error.message).toBe("One or more errors occurred!");
          expect(result.error.details?.statusCode).toBe(400);
          expect(result.error.fields).toEqual({
            password: ["password is too short!"],
          });
        }
      });

      it("should handle RFC7807 problem details validation error with errorCode", async () => {
        // Arrange - RFC7807 format with errorCode preserved
        const problemDetailsResponse = {
          type: "https://example.com/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Password validation failed",
          errorCode: "leaked_password",
          fields: {
            password: ["password is too short!"],
          },
        };

        const mockResponse = new Response(
          JSON.stringify(problemDetailsResponse),
          {
            status: 400,
            statusText: "Bad Request",
            headers: { "Content-Type": "application/json" },
          },
        );

        mockFetch.mockResolvedValueOnce(mockResponse);

        // Act
        const result = await auth.signIn(validSignInRequest);

        // Assert
        expect(ApiResult.isError(result)).toBe(true);
        if (ApiResult.isError(result)) {
          expect(result.error.type).toBe(ApiErrorType.ValidationError);
          expect(result.error.message).toBe("Password validation failed");
          expect(result.error.errorCode).toBe("leaked_password");
          expect(result.error.fields).toEqual({
            password: ["password is too short!"],
          });
        }
      });

      it("should handle generic 400 validation error with unrecognized format", async () => {
        // Arrange - Response format that doesn't match any expected schema
        const serverErrorResponse = {
          statusCode: 400,
          message: "Bad request",
        };

        const mockResponse = new Response(JSON.stringify(serverErrorResponse), {
          status: 400,
          statusText: "Bad Request",
          headers: { "Content-Type": "application/json" },
        });

        mockFetch.mockResolvedValueOnce(mockResponse);

        // Act
        const result = await auth.signIn(validSignInRequest);

        // Assert
        expect(ApiResult.isError(result)).toBe(true);
        if (ApiResult.isError(result)) {
          expect(result.error.type).toBe(ApiErrorType.ValidationError);
          // When parseErrorResponse returns null (unrecognized format), falls back to default message
          expect(result.error.message).toBe("An unexpected error occurred.");
          expect(result.error.errorCode).toBe(ERROR_CODE.VALIDATION_ERROR);
          expect(result.error.fields).toBeUndefined();
        }
      });
    });

    describe("successful responses", () => {
      it("should handle successful sign in response", async () => {
        // Arrange
        const successResponse: SignInResponse = {
          email: "test@example.com",
          accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          refreshToken: "refresh_token_here",
        };

        const mockResponse = new Response(JSON.stringify(successResponse), {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "application/json" },
        });

        mockFetch.mockResolvedValueOnce(mockResponse);

        // Act
        const result = await auth.signIn(validSignInRequest);

        // Assert
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/auth/login"),
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify(validSignInRequest),
          }),
        );

        expect(ApiResult.isSuccess(result)).toBe(true);
        if (ApiResult.isSuccess(result)) {
          expect(result.data.email).toBe("test@example.com");
          expect(result.data.accessToken).toBe(
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          );
          expect(result.data.refreshToken).toBe("refresh_token_here");
        }
      });
    });

    describe("server error responses", () => {
      it("should handle 500 internal server error with unrecognized format", async () => {
        // Arrange
        const serverErrorResponse = {
          statusCode: 500,
          message: "Internal server error",
        };

        const mockResponse = new Response(JSON.stringify(serverErrorResponse), {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "Content-Type": "application/json" },
        });

        mockFetch.mockResolvedValueOnce(mockResponse);

        // Act
        const result = await auth.signIn(validSignInRequest);

        // Assert
        expect(ApiResult.isError(result)).toBe(true);
        if (ApiResult.isError(result)) {
          expect(result.error.type).toBe(ApiErrorType.ServerError);
          // When parseErrorResponse returns null (unrecognized format), uses default message
          expect(result.error.message).toBe("An unexpected error occurred.");
          expect(result.error.details?.statusCode).toBe(500);
        }
      });
    });

    describe("network error responses", () => {
      it("should handle network connection failure", async () => {
        // Arrange
        mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

        // Act
        const result = await auth.signIn(validSignInRequest);

        // Assert
        expect(ApiResult.isError(result)).toBe(true);
        if (ApiResult.isError(result)) {
          expect(result.error.type).toBe(ApiErrorType.NetworkError);
          expect(result.error.message).toBe(
            "Network error. Failed to connect to the Endatix API.",
          );
          expect(result.error.details?.details).toBe("Failed to fetch");
        }
      });

      it("should handle timeout errors", async () => {
        // Arrange
        mockFetch.mockRejectedValueOnce(new Error("Request timeout"));

        // Act
        const result = await auth.signIn(validSignInRequest);

        // Assert
        expect(ApiResult.isError(result)).toBe(true);
        if (ApiResult.isError(result)) {
          expect(result.error.type).toBe(ApiErrorType.UnknownError);
          expect(result.error.message).toBe("Request timeout");
          expect(result.error.details?.details).toBe("Request timeout");
        }
      });
    });

    describe("request configuration", () => {
      it("should send POST request to correct endpoint without auth", async () => {
        // Arrange
        const mockResponse = new Response(JSON.stringify({}), {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "application/json" },
        });

        mockFetch.mockResolvedValueOnce(mockResponse);

        // Act
        await auth.signIn(validSignInRequest);

        // Assert
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/auth/login"),
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Accept: "application/json",
            }),
            body: JSON.stringify(validSignInRequest),
          }),
        );

        // Ensure no Authorization header is sent (requireAuth: false)
        const [, requestInit] = mockFetch.mock.calls[0];
        expect(requestInit.headers).not.toHaveProperty("Authorization");
      });
    });
  });
});

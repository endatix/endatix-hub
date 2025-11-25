import { describe, it, expect, vi, beforeEach } from "vitest";
import { handlePermissionError } from "../error-handler";
import {
  AuthorizationErrorType,
  type AuthorizationError,
} from "../../domain/authorization-result";
import { AuthErrorType } from "../../../shared/auth.types";
import {
  SIGNIN_PATH,
  AUTH_ERROR_PATH,
  UNAUTHORIZED_PATH,
} from "../../../infrastructure/auth-constants";

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mockRedirect(path);
    throw new Error(`Redirect to ${path}`);
  },
}));

describe("handlePermissionError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error when permissionError is null", () => {
    expect(() =>
      handlePermissionError(null as unknown as AuthorizationError),
    ).toThrow("An unexpected error occurred while checking permissions");
  });

  it("should throw error when permissionError is undefined", () => {
    expect(() =>
      handlePermissionError(undefined as unknown as AuthorizationError),
    ).toThrow("An unexpected error occurred while checking permissions");
  });

  it("should redirect to auth-error page with InvalidToken error when InvalidTokenError", () => {
    const error: AuthorizationError = {
      success: false,
      error: {
        type: AuthorizationErrorType.InvalidTokenError,
        message: "Invalid token",
      },
    };

    expect(() => handlePermissionError(error)).toThrow(
      `Redirect to ${AUTH_ERROR_PATH}?error=${AuthErrorType.InvalidToken}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      `${AUTH_ERROR_PATH}?error=${AuthErrorType.InvalidToken}`,
    );
  });

  it("should redirect to unauthorized page when PermissionDenied", () => {
    const error: AuthorizationError = {
      success: false,
      error: {
        type: AuthorizationErrorType.AccessDenied,
        message: "Access denied",
      },
    };

    expect(() => handlePermissionError(error)).toThrow(
      `Redirect to ${UNAUTHORIZED_PATH}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(UNAUTHORIZED_PATH);
  });

  it("should redirect to signin page when AuthenticationRequired", () => {
    const error: AuthorizationError = {
      success: false,
      error: {
        type: AuthorizationErrorType.AuthenticationRequired,
        message: "Authentication required",
      },
    };

    expect(() => handlePermissionError(error)).toThrow(
      `Redirect to ${SIGNIN_PATH}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(SIGNIN_PATH);
  });

  it("should throw error with message when error type is ServerError", () => {
    const error: AuthorizationError = {
      success: false,
      error: {
        type: AuthorizationErrorType.ServerError,
        message: "Server error occurred",
      },
    };

    expect(() => handlePermissionError(error)).toThrow("Server error occurred");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("should throw default error message when error type is unknown and no message", () => {
    const error = {
      success: false,
      error: {
        type: "UNKNOWN_ERROR_TYPE" as AuthorizationErrorType,
        message: undefined as unknown as string,
      },
    } as AuthorizationError;

    expect(() => handlePermissionError(error)).toThrow(
      "An unexpected error occurred while checking permissions",
    );
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("should prioritize InvalidTokenError over other error types", () => {
    // Even if error has multiple characteristics, InvalidTokenError should be checked first
    const error: AuthorizationError = {
      success: false,
      error: {
        type: AuthorizationErrorType.InvalidTokenError,
        message: "Invalid token",
      },
    };

    expect(() => handlePermissionError(error)).toThrow(
      `Redirect to ${AUTH_ERROR_PATH}?error=${AuthErrorType.InvalidToken}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      `${AUTH_ERROR_PATH}?error=${AuthErrorType.InvalidToken}`,
    );
  });

  it("should check error types in correct order: InvalidToken -> PermissionDenied -> AuthenticationRequired", () => {
    // Test that InvalidTokenError is checked before PermissionDenied
    const invalidTokenError: AuthorizationError = {
      success: false,
      error: {
        type: AuthorizationErrorType.InvalidTokenError,
        message: "Invalid token",
      },
    };

    expect(() => handlePermissionError(invalidTokenError)).toThrow(
      `Redirect to ${AUTH_ERROR_PATH}?error=${AuthErrorType.InvalidToken}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      `${AUTH_ERROR_PATH}?error=${AuthErrorType.InvalidToken}`,
    );

    mockRedirect.mockClear();

    // Test that PermissionDenied is checked before AuthenticationRequired
    const permissionDeniedError: AuthorizationError = {
      success: false,
      error: {
        type: AuthorizationErrorType.AccessDenied,
        message: "Access denied",
      },
    };

    expect(() => handlePermissionError(permissionDeniedError)).toThrow(
      `Redirect to ${UNAUTHORIZED_PATH}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(UNAUTHORIZED_PATH);
  });
});

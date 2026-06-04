import { ApiErrorType, type ApiError } from "@/lib/endatix-api";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  stateFromApiError,
  stateFromUnexpectedError,
} from "../server-action-state";

const telemetryLoggerMock = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: {
    error: telemetryLoggerMock.error,
  },
}));

describe("server action state helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    telemetryLoggerMock.error.mockClear();
  });

  it("maps API field errors into server action state errors", () => {
    // Arrange
    const apiError: ApiError = {
      success: false,
      error: {
        type: ApiErrorType.ValidationError,
        message: "Validation failed.",
        fields: {
          email: ["Email is already registered."],
        },
      },
    };
    const data = { email: "existing@endatix.com", roles: [] };

    // Act
    const state = stateFromApiError(apiError, data);

    // Assert
    expect(state.isSuccess).toBe(false);
    expect(state.formErrors).toEqual(["Validation failed."]);
    expect(state.errors?.email).toEqual(["Email is already registered."]);
    expect(state.data).toBe(data);
  });

  it("maps unexpected errors to a generic recoverable state", () => {
    // Arrange
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const data = { userId: "1507347517849731072" };

    // Act
    const state = stateFromUnexpectedError(
      new Error("network failed"),
      data,
      "deleteUserAction",
    );

    // Assert
    expect(state.isSuccess).toBe(false);
    expect(state.formErrors).toEqual([
      "Something went wrong. Please try again.",
    ]);
    expect(state.data).toBe(data);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(telemetryLoggerMock.error).toHaveBeenCalledWith(
      "Unexpected user-management server action error",
      undefined,
      {
        actionName: "deleteUserAction",
        isAuthFailure: false,
      },
      "organization.user-management",
    );
  });

  it.each([
    { status: 401 },
    { statusCode: 403 },
    Object.assign(new Error("auth failed"), { name: "AuthorizationError" }),
  ])("does not log known auth failures", (error) => {
    // Arrange
    const data = { userId: "1507347517849731072" };

    // Act
    const state = stateFromUnexpectedError(error, data, "deleteUserAction");

    // Assert
    expect(state.isSuccess).toBe(false);
    expect(state.formErrors).toEqual([
      "Something went wrong. Please try again.",
    ]);
    expect(state.data).toBe(data);
    expect(telemetryLoggerMock.error).not.toHaveBeenCalled();
  });
});

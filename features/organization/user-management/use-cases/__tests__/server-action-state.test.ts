import { ApiErrorType, type ApiError } from "@/lib/endatix-api";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  stateFromApiError,
  stateFromUnexpectedError,
} from "../server-action-state";

describe("server action state helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Unexpected error in deleteUserAction:",
      expect.any(Error),
    );
  });
});

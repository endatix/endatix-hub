import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { ApiResult, EndatixApi, ERROR_CODE } from "@/lib/endatix-api";
import { Kind } from "@/lib/result";
import { deleteFormAction } from "../delete-form.action";

const telemetryLoggerMock = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
}));

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: {
    error: telemetryLoggerMock.error,
  },
}));

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/endatix-api")>();

  return {
    ...actual,
    EndatixApi: vi.fn(),
  };
});

describe("deleteFormAction", () => {
  const deleteForm = vi.fn();
  const requireHubAccess = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      accessToken: "token",
    } as never);
    vi.mocked(authorization).mockResolvedValue({
      requireHubAccess,
    } as never);
    vi.mocked(EndatixApi).mockImplementation(function () {
      return {
        forms: {
          delete: deleteForm,
        },
      } as never;
    });
  });

  it("returns the API forbidden message when delete is denied", async () => {
    // Arrange
    deleteForm.mockResolvedValue(
      ApiResult.httpStatusError(403, undefined, undefined, {
        statusCode: 403,
        endpoint: "/forms/form-1",
        method: "DELETE",
      }),
    );

    // Act
    const result = await deleteFormAction("form-1");

    // Assert
    expect(EndatixApi).toHaveBeenCalledWith("token");
    expect(deleteForm).toHaveBeenCalledWith("form-1");
    expect(result.kind).toBe(Kind.Error);
    if (result.kind !== Kind.Error) {
      return;
    }

    expect(result.message).toBe(
      "You don't have permission to access this resource.",
    );
    expect(result.errorCode).toBe(ERROR_CODE.ACCESS_FORBIDDEN);
    expect(telemetryLoggerMock.error).not.toHaveBeenCalled();
  });

  it("returns the deleted form id when delete succeeds", async () => {
    // Arrange
    deleteForm.mockResolvedValue(ApiResult.success(undefined));

    // Act
    const result = await deleteFormAction("form-1");

    // Assert
    expect(result.kind).toBe(Kind.Success);
    if (result.kind !== Kind.Success) {
      return;
    }

    expect(result.value).toBe("form-1");
  });
});

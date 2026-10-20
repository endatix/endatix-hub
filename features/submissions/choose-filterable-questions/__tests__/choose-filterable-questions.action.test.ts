import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import {
  addSearchKeyAction,
  removeSearchKeyAction,
} from "../choose-filterable-questions.action";

const mockRequireAllPermissions = vi.fn();
const mockReportingExportFlag = vi.fn();
const mockAddSearchKey = vi.fn();
const mockRemoveSearchKey = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ accessToken: "token" }),
}));

vi.mock("@/features/auth/authorization", () => ({
  Permissions: {
    Access: { Hub: "access.hub" },
    Forms: { Edit: "forms.edit" },
  },
  authorization: vi.fn().mockResolvedValue({
    requireAllPermissions: (...args: unknown[]) =>
      mockRequireAllPermissions(...args),
  }),
}));

vi.mock("@/lib/feature-flags/flags", () => ({
  reportingExportFlag: () => mockReportingExportFlag(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn().mockImplementation(function () {
    return {
      reporting: {
        submissionGrid: {
          addSearchKey: (...args: unknown[]) => mockAddSearchKey(...args),
          removeSearchKey: (...args: unknown[]) => mockRemoveSearchKey(...args),
        },
      },
    };
  }),
}));

const RESPONSE = {
  formId: "5",
  keys: [{ key: "city", source: "user", filterType: "text", pending: true }],
  slots: { used: 51, max: 64, userUsed: 1, userMax: 14 },
};

describe("addSearchKeyAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAllPermissions.mockResolvedValue(undefined);
    mockReportingExportFlag.mockResolvedValue(true);
    mockAddSearchKey.mockResolvedValue(ApiResult.success(RESPONSE));
    mockRemoveSearchKey.mockResolvedValue(ApiResult.success(RESPONSE));
  });

  it("needs hub access and form edit before calling the API", async () => {
    // Arrange
    mockRequireAllPermissions.mockRejectedValue(new Error("NEXT_REDIRECT"));

    // Act
    const call = addSearchKeyAction("5", "city");

    // Assert
    await expect(call).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRequireAllPermissions).toHaveBeenCalledWith([
      "access.hub",
      "forms.edit",
    ]);
    expect(mockAddSearchKey).not.toHaveBeenCalled();
  });

  it("refuses when the reporting flag is off", async () => {
    // Arrange
    mockReportingExportFlag.mockResolvedValue(false);

    // Act
    const result = await addSearchKeyAction("5", "city");

    // Assert
    expect(Result.isError(result)).toBe(true);
    expect(mockAddSearchKey).not.toHaveBeenCalled();
  });

  it("adds the key and revalidates the grid and the settings", async () => {
    // Act
    const result = await addSearchKeyAction("5", "city");

    // Assert
    expect(result).toEqual(Result.success(RESPONSE));
    expect(mockAddSearchKey).toHaveBeenCalledWith("5", "city");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/forms/5/submissions");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/forms/5/settings");
  });

  it("passes the API's cap message through and revalidates nothing", async () => {
    // Arrange
    const cap = "A form can have 14 chosen search keys and 64 in all.";
    mockAddSearchKey.mockResolvedValue(ApiResult.validationError(cap));

    // Act
    const result = await addSearchKeyAction("5", "city");

    // Assert
    expect(Result.isError(result) && result.message).toBe(cap);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("keeps the 503 status so the UI can ask for a retry", async () => {
    // Arrange
    mockAddSearchKey.mockResolvedValue(
      ApiResult.serverError("Service Unavailable", { statusCode: 503 }),
    );

    // Act
    const result = await addSearchKeyAction("5", "city");

    // Assert
    expect(Result.isError(result) && result.statusCode).toBe(503);
  });
});

describe("removeSearchKeyAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAllPermissions.mockResolvedValue(undefined);
    mockReportingExportFlag.mockResolvedValue(true);
    mockRemoveSearchKey.mockResolvedValue(ApiResult.success(RESPONSE));
  });

  it("removes the key a person chose", async () => {
    // Act
    const result = await removeSearchKeyAction("5", "panel/city");

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    expect(mockRemoveSearchKey).toHaveBeenCalledWith("5", "panel/city");
  });
});

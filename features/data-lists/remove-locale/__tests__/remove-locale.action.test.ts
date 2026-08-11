import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { revalidatePath } from "next/cache";
import { removeLocaleAction } from "../remove-locale.action";

const { mockRemoveLocale, mockRequireHubAccess, mockAuth } = vi.hoisted(() => ({
  mockRemoveLocale: vi.fn(),
  mockRequireHubAccess: vi.fn(),
  mockAuth: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(async () => ({
    requireHubAccess: mockRequireHubAccess,
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/endatix-api")>();
  return {
    ...mod,
    EndatixApi: vi.fn().mockImplementation(function () {
      return {
        dataLists: {
          removeLocale: mockRemoveLocale,
        },
      };
    }),
  };
});

describe("removeLocaleAction", () => {
  const details = {
    id: "42",
    name: "Countries",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    itemsCount: 1,
    availableLocales: [],
    items: [{ id: "1", value: "ch", labels: { default: "Switzerland" } }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ accessToken: "token", isLoggedIn: true });
    mockRequireHubAccess.mockResolvedValue(undefined);
  });

  it("returns validation error for an invalid data list id", async () => {
    // Arrange / Act
    const result = await removeLocaleAction("not-an-id", "fr");

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("dataListId");
    expect(mockRemoveLocale).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns error for an invalid culture code", async () => {
    // Arrange / Act
    const result = await removeLocaleAction("42", "!!!");

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (!Result.isError(result)) {
      return;
    }
    expect(result.message).toContain("valid culture code");
    expect(mockRemoveLocale).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("normalizes locale, calls API, and revalidates on success", async () => {
    // Arrange
    mockRemoveLocale.mockResolvedValue(ApiResult.success(details));

    // Act
    const result = await removeLocaleAction("42", " FR ");

    // Assert
    expect(mockRemoveLocale).toHaveBeenCalledWith("42", "fr");
    expect(Result.isSuccess(result)).toBe(true);
    if (!Result.isSuccess(result)) {
      return;
    }
    expect(result.value.id).toBe("42");
    expect(revalidatePath).toHaveBeenCalledWith("/data-lists/42");
  });

  it("does not revalidate when the API call fails", async () => {
    // Arrange
    mockRemoveLocale.mockResolvedValue(
      ApiResult.notFoundError("Locale not found"),
    );

    // Act
    const result = await removeLocaleAction("42", "fr");

    // Assert
    expect(Result.isError(result)).toBe(true);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("propagates requireHubAccess failures", async () => {
    // Arrange
    mockRequireHubAccess.mockRejectedValue(new Error("NEXT_REDIRECT"));

    // Act & Assert
    await expect(removeLocaleAction("42", "fr")).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mockRemoveLocale).not.toHaveBeenCalled();
  });
});

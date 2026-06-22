import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { ApiErrorType, EndatixApi } from "@/lib/endatix-api";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { Kind, Result } from "@/lib/result";
import { getFolderBySlugAction } from "../get-folder-by-slug.action";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn(),
  ApiErrorType: {
    NotFoundError: "NotFoundError",
    ValidationError: "ValidationError",
  },
}));

const sampleFolder: Folder = {
  id: "42",
  name: "Marketing",
  slug: "marketing",
  isActive: true,
  immutable: false,
};

describe("getFolderBySlugAction", () => {
  const getBySlug = vi.fn();
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
        folders: {
          getBySlug,
        },
      } as never;
    });
  });

  it("returns folder when API succeeds", async () => {
    // Arrange
    getBySlug.mockResolvedValue({
      success: true,
      data: sampleFolder,
    });

    // Act
    const result = await getFolderBySlugAction("marketing");

    // Assert
    expect(requireHubAccess).toHaveBeenCalledOnce();
    expect(getBySlug).toHaveBeenCalledWith("marketing");
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual(sampleFolder);
    }
  });

  it("trims slug before calling API", async () => {
    // Arrange
    getBySlug.mockResolvedValue({
      success: true,
      data: sampleFolder,
    });

    // Act
    await getFolderBySlugAction("  marketing  ");

    // Assert
    expect(getBySlug).toHaveBeenCalledWith("marketing");
  });

  it("returns validation error when slug is empty", async () => {
    // Act
    const result = await getFolderBySlugAction("   ");

    // Assert
    expect(requireHubAccess).toHaveBeenCalledOnce();
    expect(getBySlug).not.toHaveBeenCalled();
    expect(result.kind).toBe(Kind.Error);
    if (result.kind === Kind.Error) {
      expect(result.message).toBe("Folder slug is required");
    }
  });

  it("maps API failure to result error", async () => {
    // Arrange
    getBySlug.mockResolvedValue({
      success: false,
      error: {
        type: ApiErrorType.NotFoundError,
        message: "Folder not found",
      },
    });

    // Act
    const result = await getFolderBySlugAction("missing");

    // Assert
    expect(getBySlug).toHaveBeenCalledWith("missing");
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Folder not found");
    }
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { ApiErrorType, EndatixApi } from "@/lib/endatix-api";
import { ErrorType, Kind } from "@/lib/result";
import { createFolderAction } from "@/features/folders/create-folder";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
  Permissions: {
    Folders: {
      Manage: "folders.manage",
    },
  },
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn(),
  ApiErrorType: {
    ValidationError: "ValidationError",
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("createFolderAction", () => {
  const create = vi.fn();
  const requireHubAccess = vi.fn().mockResolvedValue(undefined);
  const requirePermission = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      accessToken: "token",
    } as never);
    vi.mocked(authorization).mockResolvedValue({
      requireHubAccess,
      requirePermission,
    } as never);
    vi.mocked(EndatixApi).mockImplementation(function () {
      return {
        folders: {
          create,
        },
      } as never;
    });
  });

  it("maps validation field error to specific result message", async () => {
    create.mockResolvedValue({
      success: false,
      error: {
        type: ApiErrorType.ValidationError,
        message: "One or more errors occurred!",
        fields: {
          slug: ["slug must be a valid URL slug."],
        },
      },
    });

    const result = await createFolderAction({
      name: "Folder",
      slug: "bad slug",
    });

    expect(requirePermission).toHaveBeenCalledWith(Permissions.Folders.Manage);
    expect(result.kind).toBe(Kind.Error);
    if (result.kind !== Kind.Error) {
      return;
    }

    expect(result.errorType).toBe(ErrorType.ValidationError);
    expect(result.message).toBe("slug must be a valid URL slug.");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientStorageConfig } from "@/features/asset-storage/infrastructure/providers/shared/client-storage-config";

const { mockDeleteBlob } = vi.hoisted(() => ({
  mockDeleteBlob: vi.fn(),
}));

vi.mock("@/features/asset-storage/storage-runtime", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/asset-storage/storage-runtime")
    >();
  return {
    ...actual,
    requireActiveStorageProvider: vi.fn(() => ({
      deleteBlob: mockDeleteBlob,
      isEnabled: () => true,
    })),
  };
});

import { deleteUserFiles } from "../../../use-cases/delete-user-files/delete-user-files";

const storageConfig: ClientStorageConfig = {
  isEnabled: true,
  isPrivate: true,
  hostName: "test.blob.core.windows.net",
  protocol: "https",
  containerNames: { USER_FILES: "user-files", CONTENT: "content" },
  imageConfig: { isResizeEnabled: false, defaultResizeWidth: 800 },
};

describe("deleteUserFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteBlob.mockResolvedValue(undefined);
  });

  it("deletes blobs when assert passes", async () => {
    // Arrange
    const fileUrl =
      "https://test.blob.core.windows.net/user-files/s/100/200/file.pdf";

    // Act
    const results = await deleteUserFiles({
      fileUrls: [fileUrl],
      clientConfig: storageConfig,
      assertObject: () => null,
    });

    // Assert
    expect(results).toEqual([{ fileUrl, result: "success" }]);
    expect(mockDeleteBlob).toHaveBeenCalledWith({
      containerName: "user-files",
      fileName: "file.pdf",
      folderPath: "s/100/200",
    });
  });

  it("returns error when assert fails", async () => {
    // Arrange
    const fileUrl =
      "https://test.blob.core.windows.net/user-files/s/100/999/file.pdf";

    // Act
    const results = await deleteUserFiles({
      fileUrls: [fileUrl],
      clientConfig: storageConfig,
      assertObject: () => "File is not scoped to this submission",
    });

    // Assert
    expect(results[0]).toMatchObject({
      fileUrl,
      result: "error",
      error: "File is not scoped to this submission",
    });
    expect(mockDeleteBlob).not.toHaveBeenCalled();
  });
});

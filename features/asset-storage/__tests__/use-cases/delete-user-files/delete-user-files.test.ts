import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientStorageConfig } from "@/features/asset-storage/infrastructure/providers/shared/client-storage-config";

const { mockDeleteBlob } = vi.hoisted(() => ({
  mockDeleteBlob: vi.fn(),
}));

vi.mock("@/features/asset-storage/storage-runtime", () => ({
  requireActiveStorageProvider: () => ({
    deleteBlob: mockDeleteBlob,
  }),
}));

import { deleteUserFiles } from "../../../use-cases/delete-user-files/delete-user-files";

const storageConfig: ClientStorageConfig = {
  isEnabled: true,
  isPrivate: true,
  hostName: "test.blob.core.windows.net",
  protocol: "https",
  containerNames: { USER_FILES: "user-files", CONTENT: "content" },
  imageConfig: { isResizeEnabled: false },
};

describe("deleteUserFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteBlob.mockResolvedValue(undefined);
  });

  it("deletes blobs when assert passes", async () => {
    const fileUrl =
      "https://test.blob.core.windows.net/user-files/s/100/200/file.pdf";

    const results = await deleteUserFiles({
      fileUrls: [fileUrl],
      clientConfig: storageConfig,
      assertObject: () => null,
    });

    expect(results).toEqual([{ fileUrl, result: "success" }]);
    expect(mockDeleteBlob).toHaveBeenCalledWith({
      containerName: "user-files",
      fileName: "file.pdf",
      folderPath: "s/100/200",
    });
  });

  it("returns error when assert fails", async () => {
    const fileUrl =
      "https://test.blob.core.windows.net/user-files/s/100/999/file.pdf";

    const results = await deleteUserFiles({
      fileUrls: [fileUrl],
      clientConfig: storageConfig,
      assertObject: () => "File is not scoped to this submission",
    });

    expect(results[0]).toMatchObject({
      fileUrl,
      result: "error",
      error: "File is not scoped to this submission",
    });
    expect(mockDeleteBlob).not.toHaveBeenCalled();
  });
});

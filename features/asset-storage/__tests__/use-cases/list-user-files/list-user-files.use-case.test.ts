import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";
import { listUserFiles } from "@/features/asset-storage/use-cases/list-user-files/list-user-files.use-case";
import * as storageRuntime from "@/features/asset-storage/storage-runtime";
import * as blobMetadataParserModule from "@/features/asset-storage/infrastructure/providers/shared/blob-metadata-parser";
import type { StorageListBlobItem } from "@/features/asset-storage/infrastructure/providers/shared/blob-route-types";
import type { ClientStorageConfig } from "@endatix/storage-azure";

const { mockStorageProvider } = vi.hoisted(() => ({
  mockStorageProvider: {
    isEnabled: vi.fn(() => true),
    listBlobs: vi.fn(),
  },
}));

const mockContainerName = "user-files";

const enabledClientStorageConfig: ClientStorageConfig = {
  isEnabled: true,
  isPrivate: false,
  hostName: "test.blob.core.windows.net",
  protocol: "https",
  containerNames: { USER_FILES: mockContainerName, CONTENT: "content" },
  imageConfig: { isResizeEnabled: false, defaultResizeWidth: 800 },
};

vi.mock("@/features/asset-storage/storage-runtime", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/asset-storage/storage-runtime")
    >();
  return {
    ...actual,
    getClientStorageConfig: vi.fn(),
    getActiveStorageProvider: vi.fn(() => mockStorageProvider),
  };
});

vi.mock(
  "@/features/asset-storage/infrastructure/providers/shared/blob-metadata-parser",
  () => ({
    blobMetadataParser: {
      parseFromProperties: vi.fn(),
      parseFromBlob: vi.fn(),
    },
  }),
);

function createMockBlobItem(name: string): StorageListBlobItem {
  return {
    name,
    metadata: {},
    properties: { contentLength: 100, contentType: "application/pdf" },
  } as StorageListBlobItem;
}

const mockMetadata1 = {
  kind: "user" as const,
  displayName: "doc.pdf",
  contentType: "application/pdf",
  sizeInBytes: 100,
  uploadedBy: "user-1",
};
const mockMetadata2 = {
  kind: "user" as const,
  displayName: "image.jpg",
  contentType: "image/jpeg",
  sizeInBytes: 200,
  uploadedBy: "user-1",
};

describe("listUserFiles", () => {
  const formId = "f1";
  const submissionId = "s1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageRuntime.getClientStorageConfig).mockReturnValue(
      enabledClientStorageConfig,
    );
    mockStorageProvider.isEnabled.mockReturnValue(true);
    vi.mocked(storageRuntime.getActiveStorageProvider).mockReturnValue(
      mockStorageProvider as never,
    );
    vi.mocked(mockStorageProvider.listBlobs).mockResolvedValue([]);
    vi.mocked(
      blobMetadataParserModule.blobMetadataParser.parseFromBlob,
    ).mockReturnValue(mockMetadata1);
  });

  it("returns error when storage is not enabled", async () => {
    vi.mocked(storageRuntime.getClientStorageConfig).mockReturnValue({
      ...enabledClientStorageConfig,
      isEnabled: false,
    });

    const result = await listUserFiles(formId, submissionId);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Storage is not enabled");
    }
    expect(mockStorageProvider.listBlobs).not.toHaveBeenCalled();
  });

  it("returns success with empty array when listBlobs returns no blobs", async () => {
    vi.mocked(mockStorageProvider.listBlobs).mockResolvedValue([]);

    const result = await listUserFiles(formId, submissionId);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual([]);
    }
    expect(mockStorageProvider.listBlobs).toHaveBeenCalledWith({
      containerName: mockContainerName,
      formId,
      submissionId,
    });
    expect(
      blobMetadataParserModule.blobMetadataParser.parseFromBlob,
    ).not.toHaveBeenCalled();
  });

  it("returns success with mapped metadata when listBlobs returns blobs", async () => {
    const blob1 = createMockBlobItem("s/f1/s1/doc.pdf");
    const blob2 = createMockBlobItem("s/f1/s1/image.jpg");
    vi.mocked(mockStorageProvider.listBlobs).mockResolvedValue([blob1, blob2]);
    vi.mocked(blobMetadataParserModule.blobMetadataParser.parseFromBlob)
      .mockReturnValueOnce(mockMetadata1)
      .mockReturnValueOnce(mockMetadata2);

    const result = await listUserFiles(formId, submissionId);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]).toEqual(mockMetadata1);
      expect(result.value[1]).toEqual(mockMetadata2);
    }
    expect(mockStorageProvider.listBlobs).toHaveBeenCalledWith({
      containerName: mockContainerName,
      formId,
      submissionId,
    });
    expect(
      blobMetadataParserModule.blobMetadataParser.parseFromBlob,
    ).toHaveBeenCalledTimes(2);
    expect(
      blobMetadataParserModule.blobMetadataParser.parseFromBlob,
    ).toHaveBeenNthCalledWith(1, blob1);
    expect(
      blobMetadataParserModule.blobMetadataParser.parseFromBlob,
    ).toHaveBeenNthCalledWith(2, blob2);
  });

  it("returns error when listBlobs throws an Error", async () => {
    vi.mocked(mockStorageProvider.listBlobs).mockRejectedValue(
      new Error("Network error"),
    );

    const result = await listUserFiles(formId, submissionId);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Network error");
    }
  });

  it('returns "Failed to list files" when listBlobs throws non-Error', async () => {
    vi.mocked(mockStorageProvider.listBlobs).mockRejectedValue("string error");

    const result = await listUserFiles(formId, submissionId);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Failed to list files");
    }
  });
});

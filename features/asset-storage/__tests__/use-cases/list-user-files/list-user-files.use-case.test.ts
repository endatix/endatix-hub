import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";
import { listUserFiles } from "@/features/asset-storage/use-cases/list-user-files/list-user-files.use-case";
import * as storageConfig from "@/features/asset-storage/infrastructure/storage-config";
import * as storageService from "@/features/asset-storage/infrastructure/storage-service";
import * as blobMetadataParser from "@/features/asset-storage/infrastructure/blob-metadata-parser";
import type { BlobItem } from "@azure/storage-blob";

vi.mock("@/features/asset-storage/infrastructure/storage-config", () => ({
  getStorageConfig: vi.fn(),
}));

vi.mock("@/features/asset-storage/infrastructure/storage-service", () => ({
  listBlobs: vi.fn(),
}));

vi.mock("@/features/asset-storage/infrastructure/blob-metadata-parser", () => ({
  blobMetadataParser: {
    parseFromBlob: vi.fn(),
  },
}));

const mockContainerName = "user-files";
const mockPublicConfig = {
  isEnabled: true,
  containerNames: { USER_FILES: mockContainerName, CONTENT: "content" },
};

function createMockBlobItem(name: string): BlobItem {
  return {
    name,
    metadata: {},
    properties: { contentLength: 100, contentType: "application/pdf" },
  } as unknown as BlobItem;
}

const mockMetadata1 = {
  displayName: "doc.pdf",
  contentType: "application/pdf",
  sizeInBytes: 100,
};
const mockMetadata2 = {
  displayName: "image.jpg",
  contentType: "image/jpeg",
  sizeInBytes: 200,
};

describe("listUserFiles", () => {
  const formId = "f1";
  const submissionId = "s1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue(
      mockPublicConfig as ReturnType<typeof storageConfig.getStorageConfig>,
    );
    vi.mocked(storageService.listBlobs).mockResolvedValue([]);
    vi.mocked(
      blobMetadataParser.blobMetadataParser.parseFromBlob,
    ).mockReturnValue(mockMetadata1);
  });

  it("returns error when storage is not enabled", async () => {
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue({
      ...mockPublicConfig,
      isEnabled: false,
    } as ReturnType<typeof storageConfig.getStorageConfig>);

    const result = await listUserFiles(formId, submissionId);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Storage is not enabled");
    }
    expect(storageService.listBlobs).not.toHaveBeenCalled();
  });

  it("returns success with empty array when listBlobs returns no blobs", async () => {
    vi.mocked(storageService.listBlobs).mockResolvedValue([]);

    const result = await listUserFiles(formId, submissionId);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual([]);
    }
    expect(storageService.listBlobs).toHaveBeenCalledWith({
      containerName: mockContainerName,
      formId,
      submissionId,
    });
    expect(
      blobMetadataParser.blobMetadataParser.parseFromBlob,
    ).not.toHaveBeenCalled();
  });

  it("returns success with mapped metadata when listBlobs returns blobs", async () => {
    const blob1 = createMockBlobItem("s/f1/s1/doc.pdf");
    const blob2 = createMockBlobItem("s/f1/s1/image.jpg");
    vi.mocked(storageService.listBlobs).mockResolvedValue([blob1, blob2]);
    vi.mocked(blobMetadataParser.blobMetadataParser.parseFromBlob)
      .mockReturnValueOnce(mockMetadata1)
      .mockReturnValueOnce(mockMetadata2);

    const result = await listUserFiles(formId, submissionId);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]).toEqual(mockMetadata1);
      expect(result.value[1]).toEqual(mockMetadata2);
    }
    expect(storageService.listBlobs).toHaveBeenCalledWith({
      containerName: mockContainerName,
      formId,
      submissionId,
    });
    expect(
      blobMetadataParser.blobMetadataParser.parseFromBlob,
    ).toHaveBeenCalledTimes(2);
    expect(
      blobMetadataParser.blobMetadataParser.parseFromBlob,
    ).toHaveBeenNthCalledWith(1, blob1);
    expect(
      blobMetadataParser.blobMetadataParser.parseFromBlob,
    ).toHaveBeenNthCalledWith(2, blob2);
  });

  it("returns error when listBlobs throws an Error", async () => {
    vi.mocked(storageService.listBlobs).mockRejectedValue(
      new Error("Network error"),
    );

    const result = await listUserFiles(formId, submissionId);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Network error");
    }
  });

  it('returns "Failed to list files" when listBlobs throws non-Error', async () => {
    vi.mocked(storageService.listBlobs).mockRejectedValue("string error");

    const result = await listUserFiles(formId, submissionId);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Failed to list files");
    }
  });
});

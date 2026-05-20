import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";
import { getUserFile } from "@/features/asset-storage/use-cases/get-user-file/get-use-file.use-case";
import * as storageRuntime from "@/features/asset-storage/storage-runtime";
import * as storageConfig from "@endatix/storage-azure";
import * as blobMetadataParserModule from "@/features/asset-storage/infrastructure/providers/shared/blob-metadata-parser";
import * as storageUtils from "@/features/asset-storage/infrastructure/storage-utils";
import type { ClientStorageConfig } from "@endatix/storage-azure";

const { mockStorageProvider } = vi.hoisted(() => ({
  mockStorageProvider: {
    isEnabled: vi.fn(() => true),
    getBlobProperties: vi.fn(),
    bulkGenerateReadTokens: vi.fn(),
  },
}));

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

vi.mock("@endatix/storage-azure", () => ({
  getContainerUrl: vi.fn(),
}));

vi.mock(
  "@/features/asset-storage/infrastructure/providers/shared/blob-metadata-parser",
  () => ({
    blobMetadataParser: {
      parseFromProperties: vi.fn(),
      parseFromBlob: vi.fn(),
    },
  }),
);

vi.mock("@/features/asset-storage/infrastructure/storage-utils", () => ({
  buildUserFilePath: vi.fn(),
}));

const mockContainerName = "user-files";
const mockBlobName = "s/f1/s1/doc.pdf";
const mockBaseUrl = "https://account.blob.core.windows.net/user-files";
const mockPublicConfig = {
  isEnabled: true,
  isPrivate: false,
  containerNames: { USER_FILES: mockContainerName, CONTENT: "content" },
};
const mockPrivateConfig = {
  ...mockPublicConfig,
  isPrivate: true,
};

const publicClientConfig: ClientStorageConfig = {
  isEnabled: true,
  isPrivate: false,
  hostName: "account.blob.core.windows.net",
  protocol: "https",
  containerNames: { USER_FILES: mockContainerName, CONTENT: "content" },
  imageConfig: { isResizeEnabled: false, defaultResizeWidth: 800 },
};

const privateClientConfig: ClientStorageConfig = {
  ...publicClientConfig,
  isPrivate: true,
};
const mockProperties = {
  contentType: "application/pdf",
  sizeInBytes: 1024,
  metadata: { filename: "doc.pdf", questionName: "q1" },
};
const mockMetadata = {
  kind: "user" as const,
  displayName: "doc.pdf",
  contentType: "application/pdf",
  sizeInBytes: 1024,
  originalFileName: "doc.pdf",
  questionName: "q1",
  uploadedBy: "user-1",
};

describe("getUserFile", () => {
  const formId = "f1";
  const submissionId = "s1";
  const fileName = "doc.pdf";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageRuntime.getClientStorageConfig).mockReturnValue(
      publicClientConfig,
    );
    vi.mocked(storageConfig.getContainerUrl).mockReturnValue(mockBaseUrl);
    vi.mocked(storageUtils.buildUserFilePath).mockReturnValue(
      Result.success(mockBlobName),
    );
    mockStorageProvider.isEnabled.mockReturnValue(true);
    vi.mocked(storageRuntime.getActiveStorageProvider).mockReturnValue(
      mockStorageProvider as never,
    );
    vi.mocked(mockStorageProvider.getBlobProperties).mockResolvedValue(
      mockProperties,
    );
    vi.mocked(
      blobMetadataParserModule.blobMetadataParser.parseFromProperties,
    ).mockReturnValue(mockMetadata);
  });

  it("returns error when storage is not enabled", async () => {
    vi.mocked(storageRuntime.getClientStorageConfig).mockReturnValue({
      ...publicClientConfig,
      isEnabled: false,
    });

    const result = await getUserFile(formId, submissionId, fileName);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Storage is not enabled");
    }
    expect(mockStorageProvider.getBlobProperties).not.toHaveBeenCalled();
  });

  it("returns path validation error when buildUserFilePath fails", async () => {
    const pathError: ReturnType<typeof storageUtils.buildUserFilePath> =
      Result.validationError("File name is required");
    vi.mocked(storageUtils.buildUserFilePath).mockReturnValue(pathError);

    const result = await getUserFile(formId, submissionId, "");

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("File name is required");
    }
    expect(mockStorageProvider.getBlobProperties).not.toHaveBeenCalled();
  });

  it('returns "File not found" when getBlobProperties returns null', async () => {
    vi.mocked(mockStorageProvider.getBlobProperties).mockResolvedValue(null);

    const result = await getUserFile(formId, submissionId, fileName);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("File not found");
    }
    expect(mockStorageProvider.getBlobProperties).toHaveBeenCalledWith(
      mockContainerName,
      mockBlobName,
    );
  });

  it("returns success with URL and metadata when storage is public", async () => {
    const result = await getUserFile(formId, submissionId, fileName);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.url).toBe(`${mockBaseUrl}/${mockBlobName}`);
      expect(result.value.displayName).toBe(mockMetadata.displayName);
      expect(result.value.contentType).toBe(mockMetadata.contentType);
      expect(result.value.sizeInBytes).toBe(mockMetadata.sizeInBytes);
      expect(result.value.originalFileName).toBe(mockMetadata.originalFileName);
      expect(result.value.questionName).toBe(mockMetadata.questionName);
    }
    expect(storageConfig.getContainerUrl).toHaveBeenCalledWith(
      mockContainerName,
      publicClientConfig,
    );
    expect(storageUtils.buildUserFilePath).toHaveBeenCalledWith(
      formId,
      submissionId,
      fileName,
    );
    expect(mockStorageProvider.getBlobProperties).toHaveBeenCalledWith(
      mockContainerName,
      mockBlobName,
    );
    expect(
      blobMetadataParserModule.blobMetadataParser.parseFromProperties,
    ).toHaveBeenCalledWith(mockProperties, mockBlobName);
    expect(mockStorageProvider.bulkGenerateReadTokens).not.toHaveBeenCalled();
  });

  it("returns success with URL including token when storage is private", async () => {
    vi.mocked(storageRuntime.getClientStorageConfig).mockReturnValue(
      privateClientConfig,
    );
    vi.mocked(mockStorageProvider.bulkGenerateReadTokens).mockResolvedValue(
      Result.success({
        readTokens: { [mockBlobName]: "sig=abc&se=123" },
        expiresOn: new Date(),
        generatedAt: new Date(),
      }),
    );

    const result = await getUserFile(formId, submissionId, fileName);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.url).toBe(
        `${mockBaseUrl}/${mockBlobName}?sig=abc&se=123`,
      );
    }
    expect(mockStorageProvider.bulkGenerateReadTokens).toHaveBeenCalledWith({
      containerName: mockContainerName,
      resourceType: "file",
      resourceNames: [mockBlobName],
    });
  });

  it('strips leading "?" from token when appending to URL', async () => {
    vi.mocked(storageRuntime.getClientStorageConfig).mockReturnValue(
      privateClientConfig,
    );
    vi.mocked(mockStorageProvider.bulkGenerateReadTokens).mockResolvedValue(
      Result.success({
        readTokens: { [mockBlobName]: "?sig=xyz&se=456" },
        expiresOn: new Date(),
        generatedAt: new Date(),
      }),
    );

    const result = await getUserFile(formId, submissionId, fileName);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.url).toBe(
        `${mockBaseUrl}/${mockBlobName}?sig=xyz&se=456`,
      );
    }
  });

  it("returns error when private and bulkGenerateReadTokens fails", async () => {
    vi.mocked(storageRuntime.getClientStorageConfig).mockReturnValue(
      privateClientConfig,
    );
    vi.mocked(mockStorageProvider.bulkGenerateReadTokens).mockResolvedValue(
      Result.error("Token generation failed"),
    );

    const result = await getUserFile(formId, submissionId, fileName);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Token generation failed");
    }
  });
});

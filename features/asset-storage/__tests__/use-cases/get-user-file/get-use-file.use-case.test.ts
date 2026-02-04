import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";
import { getUserFile } from "@/features/asset-storage/use-cases/get-user-file/get-use-file.use-case";
import * as storageConfig from "@/features/asset-storage/infrastructure/storage-config";
import * as storageService from "@/features/asset-storage/infrastructure/storage-service";
import * as storageUtils from "@/features/asset-storage/infrastructure/storage-utils";
import * as blobMetadataParser from "@/features/asset-storage/infrastructure/blob-metadata-parser";

vi.mock("@/features/asset-storage/infrastructure/storage-config", () => ({
  getStorageConfig: vi.fn(),
  getContainerUrl: vi.fn(),
}));

vi.mock("@/features/asset-storage/infrastructure/storage-service", () => ({
  getBlobProperties: vi.fn(),
  bulkGenerateReadTokens: vi.fn(),
}));

vi.mock("@/features/asset-storage/infrastructure/storage-utils", () => ({
  buildUserFilePath: vi.fn(),
}));

vi.mock("@/features/asset-storage/infrastructure/blob-metadata-parser", () => ({
  blobMetadataParser: {
    parseFromProperties: vi.fn(),
  },
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
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue(
      mockPublicConfig as ReturnType<typeof storageConfig.getStorageConfig>,
    );
    vi.mocked(storageConfig.getContainerUrl).mockReturnValue(mockBaseUrl);
    vi.mocked(storageUtils.buildUserFilePath).mockReturnValue(
      Result.success(mockBlobName),
    );
    vi.mocked(storageService.getBlobProperties).mockResolvedValue(
      mockProperties,
    );
    vi.mocked(
      blobMetadataParser.blobMetadataParser.parseFromProperties,
    ).mockReturnValue(mockMetadata);
  });

  it("returns error when storage is not enabled", async () => {
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue({
      ...mockPublicConfig,
      isEnabled: false,
    } as ReturnType<typeof storageConfig.getStorageConfig>);

    const result = await getUserFile(formId, submissionId, fileName);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Storage is not enabled");
    }
    expect(storageService.getBlobProperties).not.toHaveBeenCalled();
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
    expect(storageService.getBlobProperties).not.toHaveBeenCalled();
  });

  it('returns "File not found" when getBlobProperties returns null', async () => {
    vi.mocked(storageService.getBlobProperties).mockResolvedValue(null);

    const result = await getUserFile(formId, submissionId, fileName);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("File not found");
    }
    expect(storageService.getBlobProperties).toHaveBeenCalledWith(
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
      mockPublicConfig,
    );
    expect(storageUtils.buildUserFilePath).toHaveBeenCalledWith(
      formId,
      submissionId,
      fileName,
    );
    expect(storageService.getBlobProperties).toHaveBeenCalledWith(
      mockContainerName,
      mockBlobName,
    );
    expect(
      blobMetadataParser.blobMetadataParser.parseFromProperties,
    ).toHaveBeenCalledWith(mockProperties, mockBlobName);
    expect(storageService.bulkGenerateReadTokens).not.toHaveBeenCalled();
  });

  it("returns success with URL including token when storage is private", async () => {
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue(
      mockPrivateConfig as ReturnType<typeof storageConfig.getStorageConfig>,
    );
    vi.mocked(storageService.bulkGenerateReadTokens).mockResolvedValue(
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
    expect(storageService.bulkGenerateReadTokens).toHaveBeenCalledWith({
      containerName: mockContainerName,
      resourceType: "file",
      resourceNames: [mockBlobName],
    });
  });

  it('strips leading "?" from token when appending to URL', async () => {
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue(
      mockPrivateConfig as ReturnType<typeof storageConfig.getStorageConfig>,
    );
    vi.mocked(storageService.bulkGenerateReadTokens).mockResolvedValue(
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
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue(
      mockPrivateConfig as ReturnType<typeof storageConfig.getStorageConfig>,
    );
    vi.mocked(storageService.bulkGenerateReadTokens).mockResolvedValue(
      Result.error("Token generation failed"),
    );

    const result = await getUserFile(formId, submissionId, fileName);

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Token generation failed");
    }
  });
});

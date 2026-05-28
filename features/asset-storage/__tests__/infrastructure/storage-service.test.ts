import { Result } from "@/lib/result";
import {
  BlobServiceClient,
  ContainerClient,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BulkReadUrlsOptions,
  FileOptions,
  FolderOptions,
} from "../../infrastructure/core";

// 1. Hoist shared mock instances so they are available to vi.mock() and test blocks.
const azureMocks = vi.hoisted(() => {
  const blockBlobClient = {
    uploadData: vi.fn().mockResolvedValue(undefined),
    url: "https://test.blob.core.windows.net/test",
    generateSasUrl: vi
      .fn()
      .mockReturnValue("https://test.blob.core.windows.net/test?sas-token"),
    delete: vi.fn().mockResolvedValue(undefined),
    getProperties: vi.fn().mockResolvedValue({
      contentType: "application/pdf",
      contentLength: 2048,
      metadata: { filename: "doc.pdf", questionName: "q1" },
    }),
  };

  const containerClient = {
    getBlockBlobClient: vi.fn(() => blockBlobClient),
    listBlobsFlat: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield {
          name: "s/form-1/sub-1/file.pdf",
          metadata: {},
          properties: { contentType: "application/pdf", contentLength: 1024 },
        };
      },
    }),
  };

  const blobServiceClient = {
    getContainerClient: vi.fn(() => containerClient),
  };

  return { blockBlobClient, containerClient, blobServiceClient };
});

// 2. Mock module: inject hoisted mocks. Constructors use function (Vitest 4).
vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: vi.fn().mockImplementation(function () {
    return azureMocks.blobServiceClient;
  }),
  ContainerClient: vi.fn().mockImplementation(function () {
    return azureMocks.containerClient;
  }),
  BlockBlobClient: vi.fn().mockImplementation(function () {
    return azureMocks.blockBlobClient;
  }),
  StorageSharedKeyCredential: vi.fn().mockImplementation(function (
    this: unknown,
  ) {
    return {};
  }),
  BlobSASPermissions: {
    parse: vi.fn().mockReturnValue({ write: true, read: true }),
  },
  SASProtocol: {
    HttpsAndHttp: "https,http",
    Https: "https",
  },
  generateBlobSASQueryParameters: vi.fn(),
}));
vi.mock("next/dist/server/image-optimizer");

// 3. Re-import after env changes so the runtime sees updated process.env.
const loadStorageProvider = async () => {
  const runtime = await import("../../storage-runtime");

  return {
    generateUploadUrl: async (fileOptions: FileOptions) =>
      runtime.requireActiveStorageProvider().generateUploadUrl(fileOptions),
    bulkGenerateReadTokens: (options: BulkReadUrlsOptions) => {
      const provider = runtime.getActiveStorageProvider();
      if (provider === null || !provider.isEnabled()) {
        return Promise.resolve(Result.error("Storage is not enabled"));
      }

      return provider.bulkGenerateReadTokens(options);
    },
    deleteBlob: async (fileOptions: FileOptions) =>
      runtime.requireActiveStorageProvider().deleteBlob(fileOptions),
    listBlobs: async (folderOptions: FolderOptions) =>
      runtime.requireActiveStorageProvider().listBlobs(folderOptions),
    getBlobProperties: (containerName: string, blobName: string) =>
      runtime
        .getActiveStorageProvider()
        ?.getBlobProperties(containerName, blobName) ?? Promise.resolve(null),
    resetActiveStorageProviderClient: runtime.resetActiveStorageProviderClient,
  };
};

describe("Active storage provider", () => {
  const mockAccountName = "mock-account-name";
  const mockAccountKey = "mock-account-key";
  const mockContainerName = "test-container";
  const mockFolderPath = "test-folder";
  const mockFileName = "test.jpg";

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.STORAGE_PROVIDER = "azure";
    process.env.STORAGE_AZURE_ACCOUNT_NAME = mockAccountName;
    process.env.STORAGE_AZURE_ACCOUNT_KEY = mockAccountKey;
    process.env.STORAGE_AZURE_ENDPOINT = `${mockAccountName}.blob.core.windows.net`;
  });

  describe("generateUploadUrl", () => {
    it("should throw error when storage is not enabled", async () => {
      // Arrange
      process.env.STORAGE_PROVIDER = "none";
      const { generateUploadUrl } = await loadStorageProvider();
      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => generateUploadUrl(fileOptions)).rejects.toThrow(
        "Storage is not enabled",
      );
    });

    it("should successfully generate SAS URL", async () => {
      // Arrange
      const { generateUploadUrl } = await loadStorageProvider();
      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act
      const result = await generateUploadUrl(fileOptions);

      // Assert
      expect(BlobServiceClient).toHaveBeenCalledWith(
        `https://${mockAccountName}.blob.core.windows.net`,
        expect.anything(),
      );
      expect(
        azureMocks.containerClient.getBlockBlobClient,
      ).toHaveBeenCalledWith(`${mockFolderPath}/${mockFileName}`);
      expect(azureMocks.blockBlobClient.generateSasUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          protocol: "https",
        }),
      );
      expect(result).toEqual({
        url: "https://test.blob.core.windows.net/test?sas-token",
        key: `${mockFolderPath}/${mockFileName}`,
        headers: { "x-ms-blob-type": "BlockBlob" },
      });
    });

    it("should throw error when fileName is not provided", async () => {
      // Arrange
      const { generateUploadUrl } = await loadStorageProvider();
      const fileOptions = {
        fileName: "",
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => generateUploadUrl(fileOptions)).rejects.toThrow(
        "a file is not provided",
      );
    });

    it("should throw error when folderPath is not provided", async () => {
      // Arrange
      const { generateUploadUrl } = await loadStorageProvider();
      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: "",
      };

      // Act & Assert
      await expect(() => generateUploadUrl(fileOptions)).rejects.toThrow(
        "a folder path is not provided",
      );
    });

    it("should throw error when containerName is not provided", async () => {
      // Arrange
      const { generateUploadUrl } = await loadStorageProvider();
      const fileOptions = {
        fileName: mockFileName,
        containerName: "",
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => generateUploadUrl(fileOptions)).rejects.toThrow(
        "container name is not provided",
      );
    });

    it("should handle errors gracefully when generateSasUrl fails", async () => {
      // Arrange
      const { generateUploadUrl } = await loadStorageProvider();
      azureMocks.blockBlobClient.generateSasUrl.mockImplementationOnce(() => {
        throw new Error("SAS generation failed");
      });
      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => generateUploadUrl(fileOptions)).rejects.toThrow(
        "SAS generation failed",
      );
    });
  });

  describe("generateReadTokens", () => {
    const mockSasToken =
      "?sv=2021-06-08&ss=b&srt=sco&sp=r&se=2024-01-01T00:00:00Z&sig=test";

    beforeEach(() => {
      vi.mocked(generateBlobSASQueryParameters).mockReturnValue({
        toString: () => mockSasToken,
      } as ReturnType<typeof generateBlobSASQueryParameters>);
    });

    it("should return error when storage is not enabled", async () => {
      // Arrange
      process.env.STORAGE_PROVIDER = "none";
      const { bulkGenerateReadTokens: generateReadTokens } =
        await loadStorageProvider();

      // Act
      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "file",
        resourceNames: ["test.jpg"],
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Storage is not enabled");
      }
    });

    it("should return error when storage is not private", async () => {
      // Arrange
      process.env.STORAGE_IS_PRIVATE = "false";
      vi.resetModules();
      const { bulkGenerateReadTokens: generateReadTokens } =
        await loadStorageProvider();

      // Act
      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "file",
        resourceNames: ["test.jpg"],
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Azure storage is not private");
      }
    });

    it("should return validation error when containerName is not provided", async () => {
      // Arrange
      process.env.STORAGE_IS_PRIVATE = "true";
      vi.resetModules();
      const { bulkGenerateReadTokens: generateReadTokens } =
        await loadStorageProvider();

      // Act
      const result = await generateReadTokens({
        containerName: "",
        resourceType: "file",
        resourceNames: ["test.jpg"],
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("A container name is not provided");
      }
    });

    it("should return validation error when resourceType is not provided", async () => {
      // Arrange
      process.env.STORAGE_IS_PRIVATE = "true";
      vi.resetModules();
      const { bulkGenerateReadTokens: generateReadTokens } =
        await loadStorageProvider();

      // Act
      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: undefined as unknown as "file",
        resourceNames: ["test.jpg"],
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("A resource type is not provided");
      }
    });

    it("should return validation error when resourceNames are missing for file type", async () => {
      // Arrange
      process.env.STORAGE_IS_PRIVATE = "true";
      vi.resetModules();
      const { bulkGenerateReadTokens: generateReadTokens } =
        await loadStorageProvider();

      // Act
      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "file",
        resourceNames: [],
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe(
          "Resource names are required for file or directory resource types",
        );
      }
    });

    it("rejects container-level read token requests", async () => {
      process.env.STORAGE_IS_PRIVATE = "true";
      vi.resetModules();
      const { bulkGenerateReadTokens: generateReadTokens } =
        await loadStorageProvider();

      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "container",
        resourceNames: [mockContainerName],
      });

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe(
          "Container-level read tokens are not supported; use per-file reads",
        );
      }
      expect(generateBlobSASQueryParameters).not.toHaveBeenCalled();
    });

    it("should generate blob-level tokens for multiple files", async () => {
      // Arrange
      process.env.STORAGE_IS_PRIVATE = "true";
      vi.resetModules();
      const { bulkGenerateReadTokens: generateReadTokens } =
        await loadStorageProvider();
      const resourceNames = ["file1.jpg", "file2.png", "file3.pdf"];

      // Act
      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "file",
        resourceNames,
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(Object.keys(result.value.readTokens)).toHaveLength(3);
        resourceNames.forEach((name) => {
          expect(result.value.readTokens[name]).toBe(mockSasToken);
        });
        expect(result.value.expiresOn).toBeInstanceOf(Date);
        expect(result.value.generatedAt).toBeInstanceOf(Date);
      }

      expect(generateBlobSASQueryParameters).toHaveBeenCalledTimes(3);
      resourceNames.forEach((name) => {
        expect(generateBlobSASQueryParameters).toHaveBeenCalledWith(
          expect.objectContaining({
            containerName: mockContainerName,
            blobName: name,
            permissions: expect.anything(),
            startsOn: expect.any(Date),
            expiresOn: expect.any(Date),
            protocol: expect.anything(),
          }),
          expect.anything(),
        );
      });
    });

    it("should use custom expiresInMinutes when provided", async () => {
      // Arrange
      process.env.STORAGE_IS_PRIVATE = "true";
      vi.resetModules();
      const { bulkGenerateReadTokens: generateReadTokens } =
        await loadStorageProvider();
      const customExpiryMinutes = 60;
      const beforeCall = Date.now();

      // Act
      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "file",
        resourceNames: ["test.jpg"],
        expiresInMinutes: customExpiryMinutes,
      });
      const afterCall = Date.now();

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        const expectedExpiry = beforeCall + customExpiryMinutes * 60 * 1000;
        const actualExpiry = result.value.expiresOn.getTime();
        expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(actualExpiry).toBeLessThanOrEqual(
          afterCall + customExpiryMinutes * 60 * 1000,
        );
      }
    });

    it("should use default expiresInMinutes when not provided", async () => {
      // Arrange
      process.env.STORAGE_IS_PRIVATE = "true";
      process.env.STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES = "30";
      vi.resetModules();
      const { bulkGenerateReadTokens: generateReadTokens } =
        await loadStorageProvider();
      const beforeCall = Date.now();

      // Act
      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "file",
        resourceNames: ["test.jpg"],
      });
      const afterCall = Date.now();

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        const expectedExpiry = beforeCall + 30 * 60 * 1000;
        const actualExpiry = result.value.expiresOn.getTime();
        expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(actualExpiry).toBeLessThanOrEqual(afterCall + 30 * 60 * 1000);
      }
    });

    it("should handle errors gracefully", async () => {
      // Arrange
      process.env.STORAGE_IS_PRIVATE = "true";
      vi.resetModules();
      const error = new Error("SAS generation failed");
      vi.mocked(generateBlobSASQueryParameters).mockImplementationOnce(() => {
        throw error;
      });
      const { bulkGenerateReadTokens: generateReadTokens } =
        await loadStorageProvider();

      // Act
      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "file",
        resourceNames: ["test.jpg"],
      });

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe(
          "Unexpected error generating Read SAS Tokens",
        );
      }
    });
  });

  describe("deleteBlob", () => {
    it("should throw error when storage is not enabled", async () => {
      // Arrange
      process.env.STORAGE_PROVIDER = "none";
      const { deleteBlob } = await loadStorageProvider();
      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => deleteBlob(fileOptions)).rejects.toThrow(
        "Storage is not enabled",
      );
    });

    it("should successfully delete blob with folder path", async () => {
      // Arrange
      const { deleteBlob } = await loadStorageProvider();
      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act
      await deleteBlob(fileOptions);

      // Assert
      expect(BlobServiceClient).toHaveBeenCalledWith(
        `https://${mockAccountName}.blob.core.windows.net`,
        expect.anything(),
      );
      expect(
        azureMocks.containerClient.getBlockBlobClient,
      ).toHaveBeenCalledWith(`${mockFolderPath}/${mockFileName}`);
      expect(azureMocks.blockBlobClient.delete).toHaveBeenCalledTimes(1);
    });

    it("should successfully delete blob without folder path", async () => {
      // Arrange
      const { deleteBlob } = await loadStorageProvider();
      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
      };

      // Act
      await deleteBlob(fileOptions);

      // Assert
      expect(BlobServiceClient).toHaveBeenCalledWith(
        `https://${mockAccountName}.blob.core.windows.net`,
        expect.anything(),
      );
      expect(
        azureMocks.containerClient.getBlockBlobClient,
      ).toHaveBeenCalledWith(mockFileName);
      expect(azureMocks.blockBlobClient.delete).toHaveBeenCalledTimes(1);
    });

    it("should throw error when fileName is not provided", async () => {
      // Arrange
      const { deleteBlob } = await loadStorageProvider();
      const fileOptions = {
        fileName: "",
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => deleteBlob(fileOptions)).rejects.toThrow(
        "a file is not provided",
      );
    });

    it("should throw error when containerName is not provided", async () => {
      // Arrange
      const { deleteBlob } = await loadStorageProvider();
      const fileOptions = {
        fileName: mockFileName,
        containerName: "",
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => deleteBlob(fileOptions)).rejects.toThrow(
        "container name is not provided",
      );
    });

    it("should handle delete errors gracefully", async () => {
      // Arrange
      const { deleteBlob } = await loadStorageProvider();
      azureMocks.blockBlobClient.delete.mockRejectedValueOnce(
        new Error("Blob not found"),
      );
      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => deleteBlob(fileOptions)).rejects.toThrow(
        "Blob not found",
      );
      expect(azureMocks.blockBlobClient.delete).toHaveBeenCalledTimes(1);
    });

    it("should use singleton BlobServiceClient", async () => {
      // Arrange
      const { deleteBlob, generateUploadUrl } = await loadStorageProvider();
      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act
      await generateUploadUrl(fileOptions);
      await deleteBlob(fileOptions);

      // Assert
      expect(BlobServiceClient).toHaveBeenCalledTimes(1);
    });
  });

  describe("listBlobs", () => {
    const mockFormId = "form-1";
    const mockSubmissionId = "sub-1";

    it("should return blobs when folder path is valid", async () => {
      // Arrange
      const { listBlobs } = await loadStorageProvider();
      const folderOptions = {
        containerName: "user-files",
        formId: mockFormId,
        submissionId: mockSubmissionId,
      };

      // Act
      const result = await listBlobs(folderOptions);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("s/form-1/sub-1/file.pdf");
      expect(azureMocks.containerClient.listBlobsFlat).toHaveBeenCalledWith(
        expect.objectContaining({
          prefix: "s/form-1/sub-1",
          includeDeleted: false,
          includeMetadata: true,
        }),
      );
    });

    it("should throw when formId is empty", async () => {
      // Arrange
      const { listBlobs } = await loadStorageProvider();
      const folderOptions = {
        containerName: "user-files",
        formId: "",
        submissionId: mockSubmissionId,
      };

      // Act & Assert
      await expect(listBlobs(folderOptions)).rejects.toThrow(
        "Form ID is required",
      );
    });

    it("should throw when submissionId is empty", async () => {
      // Arrange
      const { listBlobs } = await loadStorageProvider();
      const folderOptions = {
        containerName: "user-files",
        formId: mockFormId,
        submissionId: "",
      };

      // Act & Assert
      await expect(listBlobs(folderOptions)).rejects.toThrow(
        "Submission ID is required",
      );
    });

    it("should exclude blobs with contentLength 0 (folder placeholders)", async () => {
      // Arrange
      const asyncIterable = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            name: "s/form-1/sub-1/",
            metadata: {},
            properties: {
              contentType: "application/octet-stream",
              contentLength: 0,
            },
          };
        },
      };
      azureMocks.containerClient.listBlobsFlat.mockReturnValueOnce(
        asyncIterable as unknown as ReturnType<
          ContainerClient["listBlobsFlat"]
        >,
      );
      const { listBlobs } = await loadStorageProvider();

      // Act
      const result = await listBlobs({
        containerName: "user-files",
        formId: mockFormId,
        submissionId: mockSubmissionId,
      });

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should include blobs with empty contentType when contentLength > 0", async () => {
      // Arrange
      const asyncIterable = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            name: "s/form-1/sub-1/weird.pdf",
            metadata: {},
            properties: { contentType: "", contentLength: 1024 },
          };
        },
      };
      azureMocks.containerClient.listBlobsFlat.mockReturnValueOnce(
        asyncIterable as unknown as ReturnType<
          ContainerClient["listBlobsFlat"]
        >,
      );
      const { listBlobs } = await loadStorageProvider();

      // Act
      const result = await listBlobs({
        containerName: "user-files",
        formId: mockFormId,
        submissionId: mockSubmissionId,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("s/form-1/sub-1/weird.pdf");
    });

    it("should exclude blobs when properties is undefined (no throw)", async () => {
      // Arrange
      const asyncIterable = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            name: "s/form-1/sub-1/legacy",
            metadata: {},
            properties: undefined,
          };
        },
      };
      azureMocks.containerClient.listBlobsFlat.mockReturnValueOnce(
        asyncIterable as unknown as ReturnType<
          ContainerClient["listBlobsFlat"]
        >,
      );
      const { listBlobs } = await loadStorageProvider();

      // Act
      const result = await listBlobs({
        containerName: "user-files",
        formId: mockFormId,
        submissionId: mockSubmissionId,
      });

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should exclude blobs when contentLength is undefined", async () => {
      // Arrange
      const asyncIterable = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            name: "s/form-1/sub-1/incomplete",
            metadata: {},
            properties: {
              contentType: "application/pdf",
              contentLength: undefined,
            },
          };
        },
      };
      azureMocks.containerClient.listBlobsFlat.mockReturnValueOnce(
        asyncIterable as unknown as ReturnType<
          ContainerClient["listBlobsFlat"]
        >,
      );
      const { listBlobs } = await loadStorageProvider();

      // Act
      const result = await listBlobs({
        containerName: "user-files",
        formId: mockFormId,
        submissionId: mockSubmissionId,
      });

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should include blobs when contentType is undefined but contentLength > 0", async () => {
      // Arrange
      const asyncIterable = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            name: "s/form-1/sub-1/raw",
            metadata: {},
            properties: { contentType: undefined, contentLength: 100 },
          };
        },
      };
      azureMocks.containerClient.listBlobsFlat.mockReturnValueOnce(
        asyncIterable as unknown as ReturnType<
          ContainerClient["listBlobsFlat"]
        >,
      );
      const { listBlobs } = await loadStorageProvider();

      // Act
      const result = await listBlobs({
        containerName: "user-files",
        formId: mockFormId,
        submissionId: mockSubmissionId,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("s/form-1/sub-1/raw");
    });

    it("should return only blobs with contentLength > 0", async () => {
      // Arrange
      const asyncIterable = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            name: "s/form-1/sub-1/folder/",
            metadata: {},
            properties: {
              contentType: "application/octet-stream",
              contentLength: 0,
            },
          };
          yield {
            name: "s/form-1/sub-1/doc.pdf",
            metadata: {},
            properties: { contentType: "application/pdf", contentLength: 2048 },
          };
          yield {
            name: "s/form-1/sub-1/empty-type.jpg",
            metadata: {},
            properties: { contentType: "", contentLength: 100 },
          };
          yield {
            name: "s/form-1/sub-1/image.png",
            metadata: {},
            properties: { contentType: "image/png", contentLength: 512 },
          };
        },
      };
      azureMocks.containerClient.listBlobsFlat.mockReturnValueOnce(
        asyncIterable as unknown as ReturnType<
          ContainerClient["listBlobsFlat"]
        >,
      );
      const { listBlobs } = await loadStorageProvider();

      // Act
      const result = await listBlobs({
        containerName: "user-files",
        formId: mockFormId,
        submissionId: mockSubmissionId,
      });

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map((b) => b.name)).toEqual([
        "s/form-1/sub-1/doc.pdf",
        "s/form-1/sub-1/empty-type.jpg",
        "s/form-1/sub-1/image.png",
      ]);
    });
  });

  describe("getBlobProperties", () => {
    const mockBlobName = "s/form-1/sub-1/file.pdf";

    it("should return properties when blob exists", async () => {
      // Arrange
      const { getBlobProperties } = await loadStorageProvider();

      // Act
      const result = await getBlobProperties(mockContainerName, mockBlobName);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.contentType).toBe("application/pdf");
      expect(result?.sizeInBytes).toBe(2048);
      expect(result?.metadata).toEqual({
        filename: "doc.pdf",
        questionName: "q1",
      });
      expect(
        azureMocks.containerClient.getBlockBlobClient,
      ).toHaveBeenCalledWith(mockBlobName);
      expect(azureMocks.blockBlobClient.getProperties).toHaveBeenCalledTimes(1);
    });

    it("should return null when storage is not enabled", async () => {
      // Arrange
      process.env.STORAGE_PROVIDER = "none";
      const { getBlobProperties } = await loadStorageProvider();

      // Act
      const result = await getBlobProperties(mockContainerName, mockBlobName);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when containerName is empty", async () => {
      // Arrange
      const { getBlobProperties } = await loadStorageProvider();

      // Act
      const result = await getBlobProperties("", mockBlobName);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when blobName is empty", async () => {
      // Arrange
      const { getBlobProperties } = await loadStorageProvider();

      // Act
      const result = await getBlobProperties(mockContainerName, "");

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when getProperties throws", async () => {
      // Arrange
      azureMocks.blockBlobClient.getProperties.mockRejectedValueOnce(
        new Error("Blob not found"),
      );
      const { getBlobProperties } = await loadStorageProvider();

      // Act
      const result = await getBlobProperties(mockContainerName, mockBlobName);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("resetActiveStorageProviderClient", () => {
    it("should reset the singleton client", async () => {
      // Arrange
      const { resetActiveStorageProviderClient, generateUploadUrl } =
        await loadStorageProvider();
      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act - instantiate client, then reset, then call again
      await generateUploadUrl(fileOptions);
      resetActiveStorageProviderClient();
      await generateUploadUrl(fileOptions);

      // Assert - client was created twice
      expect(BlobServiceClient).toHaveBeenCalledTimes(2);
    });
  });

  describe("Singleton Pattern", () => {
    it("should reuse the same BlobServiceClient instance", async () => {
      // Arrange
      const { generateUploadUrl, deleteBlob } = await loadStorageProvider();
      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act - generate URL and delete (same client)
      await generateUploadUrl(fileOptions);
      await deleteBlob(fileOptions);

      // Assert
      expect(BlobServiceClient).toHaveBeenCalledTimes(1);
    });
  });
});

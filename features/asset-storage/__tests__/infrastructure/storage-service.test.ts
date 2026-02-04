import { Result } from "@/lib/result";
import {
  BlobServiceClient,
  BlockBlobClient,
  ContainerClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock entire module
vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: vi.fn(),
  ContainerClient: vi.fn(),
  BlockBlobClient: vi.fn(),
  StorageSharedKeyCredential: vi.fn(),
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

describe("StorageService", () => {
  const mockAccountName = "mock-account-name";
  const mockAccountKey = "mock-account-key";
  const mockContainerName = "test-container";
  const mockFolderPath = "test-folder";
  const mockFileName = "test.jpg";
  const mockBuffer = Buffer.from("test");

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
    process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
  });

  describe("uploadToStorage", () => {
    let mockBlobClient: BlockBlobClient;
    let mockContainerClient: ContainerClient;
    let mockBlobServiceClient: BlobServiceClient;

    beforeEach(() => {
      mockBlobClient = {
        uploadData: vi.fn().mockResolvedValue(undefined),
        url: "https://test.blob.core.windows.net/test",
      } as unknown as BlockBlobClient;

      mockContainerClient = {
        getBlockBlobClient: vi.fn().mockReturnValue(mockBlobClient),
      } as unknown as ContainerClient;

      mockBlobServiceClient = {
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as unknown as BlobServiceClient;
      vi.mocked(BlobServiceClient).mockImplementation(
        () => mockBlobServiceClient,
      );
      vi.mocked(StorageSharedKeyCredential).mockImplementation(
        () => ({} as StorageSharedKeyCredential),
      );
    });

    it("should throw error when storage is not enabled (no account name)", async () => {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "";
      const uploadToStorage = await resolveUploadToStorage();
      // Act & Assert
      await expect(() =>
        uploadToStorage(
          mockBuffer,
          mockFileName,
          mockContainerName,
          mockFolderPath,
        ),
      ).rejects.toThrow("Azure storage is not enabled");
    });

    it("should throw error when storage is not enabled (no account key)", async () => {
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "";
      const uploadToStorage = await resolveUploadToStorage();

      // Act & Assert
      await expect(() =>
        uploadToStorage(
          mockBuffer,
          mockFileName,
          mockContainerName,
          mockFolderPath,
        ),
      ).rejects.toThrow("Azure storage is not enabled");
    });

    it("should successfully upload file to blob storage", async () => {
      const uploadToStorage = await resolveUploadToStorage();

      // Act
      const result = await uploadToStorage(
        mockBuffer,
        mockFileName,
        mockContainerName,
        mockFolderPath,
      );

      // Assert
      expect(BlobServiceClient).toHaveBeenCalledWith(
        `https://${mockAccountName}.blob.core.windows.net`,
        expect.anything(),
      );
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        `${mockFolderPath}/${mockFileName}`,
      );
      expect(mockBlobClient.uploadData).toHaveBeenCalledWith(
        mockBuffer,
        expect.objectContaining({
          blobHTTPHeaders: {
            blobContentType: "",
            blobContentLanguage: "",
            blobContentDisposition: "inline",
          },
          metadata: undefined,
        }),
      );
      expect(result).toBe(mockBlobClient.url);
    });

    it("should upload file to blob storage root when folder path is not provided", async () => {
      const uploadToStorage = await resolveUploadToStorage();

      // Act
      const result = await uploadToStorage(
        mockBuffer,
        mockFileName,
        mockContainerName,
      );

      // Assert
      expect(BlobServiceClient).toHaveBeenCalledWith(
        `https://${mockAccountName}.blob.core.windows.net`,
        expect.anything(),
      );
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        mockFileName,
      );
      expect(mockBlobClient.uploadData).toHaveBeenCalledWith(
        mockBuffer,
        expect.objectContaining({
          blobHTTPHeaders: {
            blobContentType: "",
            blobContentLanguage: "",
            blobContentDisposition: "inline",
          },
          metadata: undefined,
        }),
      );
      expect(result).toBe(mockBlobClient.url);
    });

    it("should handle errors gracefully when uploadData fails", async () => {
      const uploadToStorage = await resolveUploadToStorage();

      mockBlobClient.uploadData = vi
        .fn()
        .mockRejectedValue(new Error("Upload failed"));

      // Act & Assert
      await expect(
        uploadToStorage(
          mockBuffer,
          mockFileName,
          mockContainerName,
          mockFolderPath,
        ),
      ).rejects.toThrow("Upload failed");
    });

    it("should throw error when file buffer is not provided", async () => {
      const uploadToStorage = await resolveUploadToStorage();

      // Act & Assert
      await expect(
        uploadToStorage(
          undefined as unknown as Buffer,
          mockFileName,
          mockContainerName,
          mockFolderPath,
        ),
      ).rejects.toThrow("a file is not provided");
    });

    it("should throw error when fileName is not provided", async () => {
      const { uploadToStorage } = await import(
        "../../infrastructure/storage-service"
      );

      // Act & Assert
      await expect(
        uploadToStorage(mockBuffer, "", mockContainerName, mockFolderPath),
      ).rejects.toThrow("fileName is not provided");
    });

    it("should throw error when containerName is not provided", async () => {
      const { uploadToStorage } = await import(
        "../../infrastructure/storage-service"
      );

      // Act & Assert
      await expect(
        uploadToStorage(mockBuffer, mockFileName, "", mockFolderPath),
      ).rejects.toThrow("container name is not provided");
    });
  });

  describe("generateUploadUrl", () => {
    let mockBlobClient: BlockBlobClient;
    let mockContainerClient: ContainerClient;
    let mockBlobServiceClient: BlobServiceClient;

    beforeEach(() => {
      mockBlobClient = {
        generateSasUrl: vi
          .fn()
          .mockReturnValue("https://test.blob.core.windows.net/test?sas-token"),
      } as unknown as BlockBlobClient;

      mockContainerClient = {
        getBlockBlobClient: vi.fn().mockReturnValue(mockBlobClient),
      } as unknown as ContainerClient;

      mockBlobServiceClient = {
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as unknown as BlobServiceClient;
      vi.mocked(BlobServiceClient).mockImplementation(
        () => mockBlobServiceClient,
      );
      vi.mocked(StorageSharedKeyCredential).mockImplementation(
        () => ({} as StorageSharedKeyCredential),
      );
    });

    it("should throw error when storage is not enabled", async () => {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "";
      const { generateUploadUrl } = await import(
        "../../infrastructure/storage-service"
      );

      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => generateUploadUrl(fileOptions)).rejects.toThrow(
        "Azure storage is not enabled",
      );
    });

    it("should successfully generate SAS URL", async () => {
      const { generateUploadUrl } = await import(
        "../../infrastructure/storage-service"
      );

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
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        `${mockFolderPath}/${mockFileName}`,
      );
      expect(mockBlobClient.generateSasUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          protocol: "https",
        }),
      );
      expect(result).toBe("https://test.blob.core.windows.net/test?sas-token");
    });

    it("should throw error when fileName is not provided", async () => {
      const { generateUploadUrl } = await import(
        "../../infrastructure/storage-service"
      );

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
      const { generateUploadUrl } = await import(
        "../../infrastructure/storage-service"
      );

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
      const { generateUploadUrl } = await import(
        "../../infrastructure/storage-service"
      );

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
      const { generateUploadUrl } = await import(
        "../../infrastructure/storage-service"
      );

      mockBlobClient.generateSasUrl = vi.fn().mockImplementation(() => {
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
    let mockCredential: StorageSharedKeyCredential;
    const mockSasToken =
      "?sv=2021-06-08&ss=b&srt=sco&sp=r&se=2024-01-01T00:00:00Z&sig=test";

    beforeEach(() => {
      mockCredential = {} as StorageSharedKeyCredential;
      vi.mocked(StorageSharedKeyCredential).mockImplementation(
        () => mockCredential,
      );
      vi.mocked(generateBlobSASQueryParameters).mockReturnValue({
        toString: () => mockSasToken,
      } as unknown as ReturnType<typeof generateBlobSASQueryParameters>);
    });

    it("should return error when storage is not enabled", async () => {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "";
      const { bulkGenerateReadTokens: generateReadTokens } = await import(
        "../../infrastructure/storage-service"
      );

      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "file",
        resourceNames: ["test.jpg"],
      });

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Azure storage is not enabled");
      }
    });

    it("should return error when storage is not private", async () => {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
      process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
      delete process.env.AZURE_STORAGE_IS_PRIVATE;
      vi.resetModules();

      const { bulkGenerateReadTokens: generateReadTokens } = await import(
        "../../infrastructure/storage-service"
      );

      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "file",
        resourceNames: ["test.jpg"],
      });

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Azure storage is not private");
      }
    });

    it("should return validation error when containerName is not provided", async () => {
      process.env.AZURE_STORAGE_IS_PRIVATE = "true";
      vi.resetModules();

      const { bulkGenerateReadTokens: generateReadTokens } = await import(
        "../../infrastructure/storage-service"
      );

      const result = await generateReadTokens({
        containerName: "",
        resourceType: "file",
        resourceNames: ["test.jpg"],
      });

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("A container name is not provided");
      }
    });

    it("should return validation error when resourceType is not provided", async () => {
      process.env.AZURE_STORAGE_IS_PRIVATE = "true";
      vi.resetModules();

      const { bulkGenerateReadTokens: generateReadTokens } = await import(
        "../../infrastructure/storage-service"
      );

      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: undefined as unknown as "file",
        resourceNames: ["test.jpg"],
      });

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("A resource type is not provided");
      }
    });

    it("should return validation error when resourceNames are missing for file type", async () => {
      process.env.AZURE_STORAGE_IS_PRIVATE = "true";
      vi.resetModules();

      const { bulkGenerateReadTokens: generateReadTokens } = await import(
        "../../infrastructure/storage-service"
      );

      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "file",
        resourceNames: [],
      });

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe(
          "Resource names are required for file or directory resource types",
        );
      }
    });

    it("should generate container-level token", async () => {
      process.env.AZURE_STORAGE_IS_PRIVATE = "true";
      vi.resetModules();

      const { bulkGenerateReadTokens: generateReadTokens } = await import(
        "../../infrastructure/storage-service"
      );

      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "container",
      });

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value.readTokens.container).toBe(mockSasToken);
        expect(result.value.readTokens).toHaveProperty("container");
        expect(Object.keys(result.value.readTokens)).toHaveLength(1);
        expect(result.value.expiresOn).toBeInstanceOf(Date);
        expect(result.value.generatedAt).toBeInstanceOf(Date);
      }

      expect(generateBlobSASQueryParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          containerName: mockContainerName,
          permissions: expect.anything(),
          startsOn: expect.any(Date),
          expiresOn: expect.any(Date),
          protocol: expect.anything(),
        }),
        expect.anything(),
      );
    });

    it("should generate blob-level tokens for multiple files", async () => {
      process.env.AZURE_STORAGE_IS_PRIVATE = "true";
      vi.resetModules();

      const { bulkGenerateReadTokens: generateReadTokens } = await import(
        "../../infrastructure/storage-service"
      );

      const resourceNames = ["file1.jpg", "file2.png", "file3.pdf"];
      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "file",
        resourceNames,
      });

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
      process.env.AZURE_STORAGE_IS_PRIVATE = "true";
      vi.resetModules();

      const { bulkGenerateReadTokens: generateReadTokens } = await import(
        "../../infrastructure/storage-service"
      );

      const customExpiryMinutes = 60;
      const beforeCall = Date.now();
      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "container",
        expiresInMinutes: customExpiryMinutes,
      });
      const afterCall = Date.now();

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
      process.env.AZURE_STORAGE_IS_PRIVATE = "true";
      process.env.AZURE_STORAGE_SAS_READ_EXPIRY_MINUTES = "30";
      vi.resetModules();

      const { bulkGenerateReadTokens: generateReadTokens } = await import(
        "../../infrastructure/storage-service"
      );

      const beforeCall = Date.now();
      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "container",
      });
      const afterCall = Date.now();

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        const expectedExpiry = beforeCall + 30 * 60 * 1000;
        const actualExpiry = result.value.expiresOn.getTime();
        expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(actualExpiry).toBeLessThanOrEqual(afterCall + 30 * 60 * 1000);
      }
    });

    it("should handle errors gracefully", async () => {
      process.env.AZURE_STORAGE_IS_PRIVATE = "true";
      vi.resetModules();

      const error = new Error("SAS generation failed");
      vi.mocked(generateBlobSASQueryParameters).mockImplementation(() => {
        throw error;
      });

      const { bulkGenerateReadTokens: generateReadTokens } = await import(
        "../../infrastructure/storage-service"
      );

      const result = await generateReadTokens({
        containerName: mockContainerName,
        resourceType: "container",
      });

      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe(
          "Unexpected error generating Read SAS Tokens",
        );
      }
    });
  });

  describe("deleteBlob", () => {
    let mockBlobClient: BlockBlobClient;
    let mockContainerClient: ContainerClient;
    let mockBlobServiceClient: BlobServiceClient;

    beforeEach(() => {
      mockBlobClient = {
        delete: vi.fn().mockResolvedValue(undefined),
      } as unknown as BlockBlobClient;

      mockContainerClient = {
        getBlockBlobClient: vi.fn().mockReturnValue(mockBlobClient),
      } as unknown as ContainerClient;

      mockBlobServiceClient = {
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as unknown as BlobServiceClient;
      vi.mocked(BlobServiceClient).mockImplementation(
        () => mockBlobServiceClient,
      );
      vi.mocked(StorageSharedKeyCredential).mockImplementation(
        () => ({} as StorageSharedKeyCredential),
      );
    });

    it("should throw error when storage is not enabled", async () => {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "";
      const { deleteBlob } = await import(
        "../../infrastructure/storage-service"
      );

      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => deleteBlob(fileOptions)).rejects.toThrow(
        "Azure storage is not enabled",
      );
    });

    it("should successfully delete blob with folder path", async () => {
      const { deleteBlob } = await import(
        "../../infrastructure/storage-service"
      );

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
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        `${mockFolderPath}/${mockFileName}`,
      );
      expect(mockBlobClient.delete).toHaveBeenCalledTimes(1);
    });

    it("should successfully delete blob without folder path", async () => {
      const { deleteBlob } = await import(
        "../../infrastructure/storage-service"
      );

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
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        mockFileName,
      );
      expect(mockBlobClient.delete).toHaveBeenCalledTimes(1);
    });

    it("should throw error when fileName is not provided", async () => {
      const { deleteBlob } = await import(
        "../../infrastructure/storage-service"
      );

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
      const { deleteBlob } = await import(
        "../../infrastructure/storage-service"
      );

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
      const { deleteBlob } = await import(
        "../../infrastructure/storage-service"
      );

      const deleteError = new Error("Blob not found");
      mockBlobClient.delete = vi.fn().mockRejectedValue(deleteError);

      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => deleteBlob(fileOptions)).rejects.toThrow(
        "Blob not found",
      );
      expect(mockBlobClient.delete).toHaveBeenCalledTimes(1);
    });

    it("should use singleton BlobServiceClient", async () => {
      const { deleteBlob, uploadToStorage } = await import(
        "../../infrastructure/storage-service"
      );

      // Setup mock for uploadToStorage as well
      Object.assign(mockBlobClient, {
        uploadData: vi.fn().mockResolvedValue(undefined),
        url: "https://test.blob.core.windows.net/test",
      });

      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act - Call both functions
      await uploadToStorage(
        mockBuffer,
        mockFileName,
        mockContainerName,
        mockFolderPath,
      );
      await deleteBlob(fileOptions);

      // Assert - BlobServiceClient should only be instantiated once
      expect(BlobServiceClient).toHaveBeenCalledTimes(1);
    });
  });

  describe("listBlobs", () => {
    const mockFormId = "form-1";
    const mockSubmissionId = "sub-1";
    let mockContainerClient: ContainerClient;
    let mockBlobServiceClient: BlobServiceClient;

    beforeEach(() => {
      const mockBlobItem = {
        name: "s/form-1/sub-1/file.pdf",
        metadata: {},
        properties: { contentType: "application/pdf", contentLength: 1024 },
      };
      const asyncIterable = {
        [Symbol.asyncIterator]: async function* () {
          yield mockBlobItem;
        },
      };
      mockContainerClient = {
        listBlobsFlat: vi.fn().mockReturnValue(asyncIterable),
      } as unknown as ContainerClient;

      mockBlobServiceClient = {
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as unknown as BlobServiceClient;

      vi.mocked(BlobServiceClient).mockImplementation(
        () => mockBlobServiceClient,
      );
      vi.mocked(StorageSharedKeyCredential).mockImplementation(
        () => ({} as StorageSharedKeyCredential),
      );
    });

    it("should return blobs when folder path is valid", async () => {
      // Arrange
      const { listBlobs } = await import(
        "../../infrastructure/storage-service"
      );
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
      expect(mockContainerClient.listBlobsFlat).toHaveBeenCalledWith(
        expect.objectContaining({
          prefix: "s/form-1/sub-1",
          includeDeleted: false,
          includeMetadata: true,
        }),
      );
    });

    it("should throw when formId is empty", async () => {
      // Arrange
      const { listBlobs } = await import(
        "../../infrastructure/storage-service"
      );
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
      const { listBlobs } = await import(
        "../../infrastructure/storage-service"
      );
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
      vi.mocked(mockContainerClient.listBlobsFlat).mockReturnValue(
        asyncIterable as unknown as ReturnType<
          ContainerClient["listBlobsFlat"]
        >,
      );

      const { listBlobs } = await import(
        "../../infrastructure/storage-service"
      );
      const result = await listBlobs({
        containerName: "user-files",
        formId: mockFormId,
        submissionId: mockSubmissionId,
      });

      expect(result).toHaveLength(0);
    });

    it("should exclude blobs with empty contentType", async () => {
      const asyncIterable = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            name: "s/form-1/sub-1/weird.pdf",
            metadata: {},
            properties: { contentType: "", contentLength: 1024 },
          };
        },
      };
      vi.mocked(mockContainerClient.listBlobsFlat).mockReturnValue(
        asyncIterable as unknown as ReturnType<
          ContainerClient["listBlobsFlat"]
        >,
      );

      const { listBlobs } = await import(
        "../../infrastructure/storage-service"
      );
      const result = await listBlobs({
        containerName: "user-files",
        formId: mockFormId,
        submissionId: mockSubmissionId,
      });

      expect(result).toHaveLength(0);
    });

    it("should exclude blobs when properties is undefined (no throw)", async () => {
      const asyncIterable = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            name: "s/form-1/sub-1/legacy",
            metadata: {},
            properties: undefined,
          };
        },
      };
      vi.mocked(mockContainerClient.listBlobsFlat).mockReturnValue(
        asyncIterable as unknown as ReturnType<
          ContainerClient["listBlobsFlat"]
        >,
      );

      const { listBlobs } = await import(
        "../../infrastructure/storage-service"
      );
      const result = await listBlobs({
        containerName: "user-files",
        formId: mockFormId,
        submissionId: mockSubmissionId,
      });

      expect(result).toHaveLength(0);
    });

    it("should exclude blobs when contentLength is undefined", async () => {
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
      vi.mocked(mockContainerClient.listBlobsFlat).mockReturnValue(
        asyncIterable as unknown as ReturnType<
          ContainerClient["listBlobsFlat"]
        >,
      );

      const { listBlobs } = await import(
        "../../infrastructure/storage-service"
      );
      const result = await listBlobs({
        containerName: "user-files",
        formId: mockFormId,
        submissionId: mockSubmissionId,
      });

      expect(result).toHaveLength(0);
    });

    it("should exclude blobs when contentType is undefined", async () => {
      const asyncIterable = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            name: "s/form-1/sub-1/raw",
            metadata: {},
            properties: { contentType: undefined, contentLength: 100 },
          };
        },
      };
      vi.mocked(mockContainerClient.listBlobsFlat).mockReturnValue(
        asyncIterable as unknown as ReturnType<
          ContainerClient["listBlobsFlat"]
        >,
      );

      const { listBlobs } = await import(
        "../../infrastructure/storage-service"
      );
      const result = await listBlobs({
        containerName: "user-files",
        formId: mockFormId,
        submissionId: mockSubmissionId,
      });

      expect(result).toHaveLength(0);
    });

    it("should return only blobs that pass the file type check (contentLength > 0 and contentType non-empty)", async () => {
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
      vi.mocked(mockContainerClient.listBlobsFlat).mockReturnValue(
        asyncIterable as unknown as ReturnType<
          ContainerClient["listBlobsFlat"]
        >,
      );

      const { listBlobs } = await import(
        "../../infrastructure/storage-service"
      );
      const result = await listBlobs({
        containerName: "user-files",
        formId: mockFormId,
        submissionId: mockSubmissionId,
      });

      expect(result).toHaveLength(2);
      expect(result.map((b) => b.name)).toEqual([
        "s/form-1/sub-1/doc.pdf",
        "s/form-1/sub-1/image.png",
      ]);
    });
  });

  describe("getBlobProperties", () => {
    const mockBlobName = "s/form-1/sub-1/file.pdf";
    let mockBlobClient: BlockBlobClient;
    let mockContainerClient: ContainerClient;
    let mockBlobServiceClient: BlobServiceClient;

    beforeEach(() => {
      mockBlobClient = {
        getProperties: vi.fn().mockResolvedValue({
          contentType: "application/pdf",
          contentLength: 2048,
          metadata: { filename: "doc.pdf", questionName: "q1" },
        }),
      } as unknown as BlockBlobClient;

      mockContainerClient = {
        getBlockBlobClient: vi.fn().mockReturnValue(mockBlobClient),
      } as unknown as ContainerClient;

      mockBlobServiceClient = {
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as unknown as BlobServiceClient;

      vi.mocked(BlobServiceClient).mockImplementation(
        () => mockBlobServiceClient,
      );
      vi.mocked(StorageSharedKeyCredential).mockImplementation(
        () => ({} as StorageSharedKeyCredential),
      );
    });

    it("should return properties when blob exists", async () => {
      // Arrange
      const { getBlobProperties } = await import(
        "../../infrastructure/storage-service"
      );

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
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        mockBlobName,
      );
      expect(mockBlobClient.getProperties).toHaveBeenCalledTimes(1);
    });

    it("should return null when storage is not enabled", async () => {
      // Arrange
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "";
      const { getBlobProperties } = await import(
        "../../infrastructure/storage-service"
      );

      // Act
      const result = await getBlobProperties(mockContainerName, mockBlobName);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when containerName is empty", async () => {
      // Arrange
      const { getBlobProperties } = await import(
        "../../infrastructure/storage-service"
      );

      // Act
      const result = await getBlobProperties("", mockBlobName);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when blobName is empty", async () => {
      // Arrange
      const { getBlobProperties } = await import(
        "../../infrastructure/storage-service"
      );

      // Act
      const result = await getBlobProperties(mockContainerName, "");

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when getProperties throws", async () => {
      // Arrange
      mockBlobClient.getProperties = vi
        .fn()
        .mockRejectedValue(new Error("Blob not found"));
      const { getBlobProperties } = await import(
        "../../infrastructure/storage-service"
      );

      // Act
      const result = await getBlobProperties(mockContainerName, mockBlobName);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("resetBlobServiceClient", () => {
    let mockBlobClient: BlockBlobClient;
    let mockContainerClient: ContainerClient;
    let mockBlobServiceClient: BlobServiceClient;

    beforeEach(() => {
      mockBlobClient = {
        uploadData: vi.fn().mockResolvedValue(undefined),
        url: "https://test.blob.core.windows.net/test",
      } as unknown as BlockBlobClient;
      mockContainerClient = {
        getBlockBlobClient: vi.fn().mockReturnValue(mockBlobClient),
      } as unknown as ContainerClient;
      mockBlobServiceClient = {
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as unknown as BlobServiceClient;
      vi.mocked(BlobServiceClient).mockImplementation(
        () => mockBlobServiceClient,
      );
      vi.mocked(StorageSharedKeyCredential).mockImplementation(
        () => ({} as StorageSharedKeyCredential),
      );
    });

    it("should reset the singleton client", async () => {
      const { resetBlobServiceClient, uploadToStorage } = await import(
        "../../infrastructure/storage-service"
      );

      // 1. Instantiate the client by calling a function
      await uploadToStorage(
        mockBuffer,
        mockFileName,
        mockContainerName,
        mockFolderPath,
      );
      expect(BlobServiceClient).toHaveBeenCalledTimes(1);

      // 2. Reset the client
      resetBlobServiceClient();

      // 3. Call again, it should instantiate a new client
      await uploadToStorage(
        mockBuffer,
        mockFileName,
        mockContainerName,
        mockFolderPath,
      );
      expect(BlobServiceClient).toHaveBeenCalledTimes(2);
    });
  });

  describe("Singleton Pattern", () => {
    it("should reuse the same BlobServiceClient instance", async () => {
      // Setup mocks for all functions
      const mockBlobClient = {
        uploadData: vi.fn().mockResolvedValue(undefined),
        url: "https://test.blob.core.windows.net/test",
        generateSasUrl: vi
          .fn()
          .mockReturnValue("https://test.blob.core.windows.net/test?sas-token"),
        delete: vi.fn().mockResolvedValue(undefined),
      } as unknown as BlockBlobClient;

      const mockContainerClient = {
        getBlockBlobClient: vi.fn().mockReturnValue(mockBlobClient),
      } as unknown as ContainerClient;

      const mockBlobServiceClient = {
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as unknown as BlobServiceClient;

      vi.mocked(BlobServiceClient).mockImplementation(
        () => mockBlobServiceClient,
      );
      vi.mocked(StorageSharedKeyCredential).mockImplementation(
        () => ({} as StorageSharedKeyCredential),
      );

      const { uploadToStorage, generateUploadUrl, deleteBlob } = await import(
        "../../infrastructure/storage-service"
      );

      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act - Call all three functions
      await uploadToStorage(
        mockBuffer,
        mockFileName,
        mockContainerName,
        mockFolderPath,
      );
      await generateUploadUrl(fileOptions);
      await deleteBlob(fileOptions);

      // Assert - BlobServiceClient should only be instantiated once
      expect(BlobServiceClient).toHaveBeenCalledTimes(1);
    });
  });
});

const resolveUploadToStorage = async () => {
  const { uploadToStorage } = await import(
    "../../infrastructure/storage-service"
  );
  return uploadToStorage;
};

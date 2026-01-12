import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BlobServiceClient,
  ContainerClient,
  BlockBlobClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { Result } from "@/lib/result";

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
      expect(mockBlobClient.uploadData).toHaveBeenCalledWith(mockBuffer);
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
      expect(mockBlobClient.uploadData).toHaveBeenCalledWith(mockBuffer);
      expect(result).toBe(mockBlobClient.url);
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
      expect(mockBlobClient.generateSasUrl).toHaveBeenCalledWith({
        startsOn: expect.any(Date),
        permissions: { write: true, read: true }, // Mocked BlobSASPermissions.parse() return value
        expiresOn: expect.any(Date),
        protocol: "https", // SASProtocol.Https
      });
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
      const { generateReadTokens } = await import(
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

      const { generateReadTokens } = await import(
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

      const { generateReadTokens } = await import(
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

      const { generateReadTokens } = await import(
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

      const { generateReadTokens } = await import(
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

      const { generateReadTokens } = await import(
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

      const { generateReadTokens } = await import(
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

      const { generateReadTokens } = await import(
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

      const { generateReadTokens } = await import(
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

      const { generateReadTokens } = await import(
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

  describe("resetBlobServiceClient", () => {
    it("should reset the singleton client", async () => {
      const { resetBlobServiceClient } = await import(
        "../../infrastructure/storage-service"
      );

      // Act
      resetBlobServiceClient();

      // Assert - This is hard to test directly, but we can verify it doesn't throw
      expect(() => resetBlobServiceClient()).not.toThrow();
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

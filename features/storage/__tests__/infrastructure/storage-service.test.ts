import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BlobServiceClient,
  ContainerClient,
  BlockBlobClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

// Mock entire module
vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: vi.fn(),
  ContainerClient: vi.fn(),
  BlockBlobClient: vi.fn(),
  StorageSharedKeyCredential: vi.fn(),
  BlobSASPermissions: {
    parse: vi.fn().mockReturnValue({ write: true }),
  },
  SASProtocol: {
    HttpsAndHttp: "https,http",
  },
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

  describe("generateSASUrl", () => {
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
      const { generateSASUrl } = await import(
        "../../infrastructure/storage-service"
      );

      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => generateSASUrl(fileOptions)).rejects.toThrow(
        "Azure storage is not enabled",
      );
    });

    it("should successfully generate SAS URL", async () => {
      const { generateSASUrl } = await import(
        "../../infrastructure/storage-service"
      );

      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act
      const result = await generateSASUrl(fileOptions);

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
        permissions: { write: true }, // Mocked BlobSASPermissions.parse() return value
        expiresOn: expect.any(Date),
        protocol: "https,http",
      });
      expect(result).toBe("https://test.blob.core.windows.net/test?sas-token");
    });

    it("should throw error when fileName is not provided", async () => {
      const { generateSASUrl } = await import(
        "../../infrastructure/storage-service"
      );

      const fileOptions = {
        fileName: "",
        containerName: mockContainerName,
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => generateSASUrl(fileOptions)).rejects.toThrow(
        "a file is not provided",
      );
    });

    it("should throw error when folderPath is not provided", async () => {
      const { generateSASUrl } = await import(
        "../../infrastructure/storage-service"
      );

      const fileOptions = {
        fileName: mockFileName,
        containerName: mockContainerName,
        folderPath: "",
      };

      // Act & Assert
      await expect(() => generateSASUrl(fileOptions)).rejects.toThrow(
        "a folder path is not provided",
      );
    });

    it("should throw error when containerName is not provided", async () => {
      const { generateSASUrl } = await import(
        "../../infrastructure/storage-service"
      );

      const fileOptions = {
        fileName: mockFileName,
        containerName: "",
        folderPath: mockFolderPath,
      };

      // Act & Assert
      await expect(() => generateSASUrl(fileOptions)).rejects.toThrow(
        "container name is not provided",
      );
    });
  });

  describe("STORAGE_SERVICE_CONFIG", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();
      process.env = { ...originalEnv };
    });

    it("should have isEnabled true when account name and key are set", async () => {
      // Arrange
      process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
      process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;

      // Act
      const configModule = await import("../../infrastructure/storage-service");

      // Assert
      expect(configModule.STORAGE_SERVICE_CONFIG.isEnabled).toBe(true);
      expect(configModule.STORAGE_SERVICE_CONFIG.accountName).toBe(
        mockAccountName,
      );
      expect(configModule.STORAGE_SERVICE_CONFIG.accountKey).toBe(
        mockAccountKey,
      );
      expect(configModule.STORAGE_SERVICE_CONFIG.hostName).toBe(
        `${mockAccountName}.blob.core.windows.net`,
      );
    });

    it("should have isEnabled false when account name is not set", async () => {
      // Arrange
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;

      // Act
      const configModule = await import("../../infrastructure/storage-service");

      // Assert
      expect(configModule.STORAGE_SERVICE_CONFIG.isEnabled).toBe(false);
      expect(configModule.STORAGE_SERVICE_CONFIG.accountName).toBe("");
      expect(configModule.STORAGE_SERVICE_CONFIG.hostName).toBe("");
    });

    it("should have isEnabled false when account key is not set", async () => {
      // Arrange
      process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "";

      // Act
      const configModule = await import("../../infrastructure/storage-service");

      // Assert
      expect(configModule.STORAGE_SERVICE_CONFIG.isEnabled).toBe(false);
      expect(configModule.STORAGE_SERVICE_CONFIG.accountKey).toBe("");
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
      // Setup mocks for both functions
      const mockBlobClient = {
        uploadData: vi.fn().mockResolvedValue(undefined),
        url: "https://test.blob.core.windows.net/test",
        generateSasUrl: vi
          .fn()
          .mockReturnValue("https://test.blob.core.windows.net/test?sas-token"),
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

      const { uploadToStorage, generateSASUrl } = await import(
        "../../infrastructure/storage-service"
      );

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
      await generateSASUrl(fileOptions);

      // Assert - BlobServiceClient should only be instantiated once
      expect(BlobServiceClient).toHaveBeenCalledTimes(1);
    });
  });

  describe("isEnabled", () => {
    // Create a fresh import for each test
    let storageServiceModule: typeof import("../../infrastructure/storage-service");

    beforeEach(async () => {
      storageServiceModule = await import(
        "../../infrastructure/storage-service"
      );
      vi.resetModules();
      vi.clearAllMocks();
    });

    it("should return true when config is enabled", async () => {
      // Arrange
      process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
      process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
      storageServiceModule = await import(
        "../../infrastructure/storage-service"
      );

      // Act & Assert
      expect(storageServiceModule.STORAGE_SERVICE_CONFIG.isEnabled).toBe(true);
    });

    it("should return false when config is disabled", async () => {
      // Arrange
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;

      storageServiceModule = await import(
        "../../infrastructure/storage-service"
      );

      // Act & Assert
      expect(storageServiceModule.STORAGE_SERVICE_CONFIG.isEnabled).toBe(false);
    });
  });
});

const resolveUploadToStorage = async () => {
  const { uploadToStorage } = await import(
    "../../infrastructure/storage-service"
  );
  return uploadToStorage;
};

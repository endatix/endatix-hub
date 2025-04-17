import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StorageService } from "../../infrastructure/storage-service";
import {
  BlobServiceClient,
  ContainerClient,
  BlockBlobClient,
} from "@azure/storage-blob";

vi.mock("@azure/storage-blob");
vi.mock("next/dist/server/image-optimizer");

describe("StorageService", () => {
  let service: StorageService;
  const mockAccountName = "mock-account-name";
  const mockAccountKey = "mock-account-key";
  const mockContainerName = "test-container";
  const mockFolderPath = "test-folder";
  const mockFileName = "test.jpg";
  const mockBuffer = Buffer.from("test");

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
    process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
    service = new StorageService();
  });

  describe("constructor", () => {
    it("should throw error when account name is not set", () => {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "";
      expect(() => new StorageService()).toThrow(
        "Azure storage is not enabled",
      );
    });

    it("should throw error when account key is not set", () => {
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "";
      expect(() => new StorageService()).toThrow(
        "Azure storage is not enabled",
      );
    });
  });

  describe("uploadToStorage", () => {
    let mockBlobClient: BlockBlobClient;
    let mockContainerClient: ContainerClient;

    beforeEach(() => {
      mockBlobClient = {
        uploadData: vi.fn().mockResolvedValue(undefined),
        url: "https://test.blob.core.windows.net/test",
      } as unknown as BlockBlobClient;

      mockContainerClient = {
        createIfNotExists: vi.fn().mockResolvedValue(undefined),
        getBlockBlobClient: vi.fn().mockReturnValue(mockBlobClient),
      } as unknown as ContainerClient;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).blobServiceClient = {
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      } as unknown as BlobServiceClient;
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should successfully upload file to blob storage", async () => {
      // Act
      const result = await service.uploadToStorage(
        mockBuffer,
        mockFileName,
        mockContainerName,
        mockFolderPath,
      );

      // Assert
      expect(mockContainerClient.createIfNotExists).toHaveBeenCalledWith({
        access: "container",
      });
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        `${mockFolderPath}/${mockFileName}`,
      );
      expect(mockBlobClient.uploadData).toHaveBeenCalledWith(mockBuffer);
      expect(result).toBe(mockBlobClient.url);
    });

    it("should upload file to blob storage root when folder path is not provided", async () => {
      // Act
      const result = await service.uploadToStorage(
        mockBuffer,
        mockFileName,
        mockContainerName,
      );

      // Assert
      expect(mockContainerClient.createIfNotExists).toHaveBeenCalledWith({
        access: "container",
      });
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        mockFileName,
      );
      expect(mockBlobClient.uploadData).toHaveBeenCalledWith(mockBuffer);
      expect(result).toBe(mockBlobClient.url);
    });

    it("should throw error when file buffer is not provided", async () => {
      // Act & Assert
      await expect(
        service.uploadToStorage(
          undefined as unknown as Buffer,
          mockFileName,
          mockContainerName,
          mockFolderPath,
        ),
      ).rejects.toThrow("a file is not provided");
    });

    it("should throw error when fileName is not provided", async () => {
      // Act & Assert
      await expect(
        service.uploadToStorage(
          mockBuffer,
          "",
          mockContainerName,
          mockFolderPath,
        ),
      ).rejects.toThrow("fileName is not provided");
    });

    it("should throw error when containerName is not provided", async () => {
      // Act & Assert
      await expect(
        service.uploadToStorage(mockBuffer, mockFileName, "", mockFolderPath),
      ).rejects.toThrow("container name is not provided");
    });
  });

  describe("getAzureStorageConfig", () => {
    it("should return enabled config when account name and key are set", () => {
      // Arrange
      process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
      process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;

      // Act
      const config = StorageService.getAzureStorageConfig();

      // Assert
      expect(config.isEnabled).toBe(true);
      expect(config.accountName).toBe(mockAccountName);
      expect(config.accountKey).toBe(mockAccountKey);
      expect(config.hostName).toBe(`${mockAccountName}.blob.core.windows.net`);
    });

    it("should return disabled config when account name or key is not set", () => {
      // Arrange
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "";

      // Act
      const config = StorageService.getAzureStorageConfig();

      // Assert
      expect(config.isEnabled).toBe(false);
      expect(config.accountName).toBe("");
      expect(config.accountKey).toBe("");
      expect(config.hostName).toBe("");
    });
  });
});

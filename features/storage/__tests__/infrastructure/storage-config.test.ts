import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getStorageConfig,
  getContainerNames,
} from "../../infrastructure/storage-config";

describe("StorageConfig", () => {
  const mockAccountName = "mock-account-name";
  const mockAccountKey = "mock-account-key";
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  describe("getStorageConfig", () => {
    describe("isEnabled", () => {
      it("should be true when account name and key are set", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.isEnabled).toBe(true);
        expect(config.accountName).toBe(mockAccountName);
        expect(config.accountKey).toBe(mockAccountKey);
        expect(config.hostName).toBe(
          `${mockAccountName}.blob.core.windows.net`,
        );
      });

      it("should be false when account name is not set", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = "";
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.isEnabled).toBe(false);
        expect(config.accountName).toBe("");
        expect(config.hostName).toBe("");
      });

      it("should be false when account key is not set", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = "";

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.isEnabled).toBe(false);
        expect(config.accountKey).toBe("");
      });

      it("should be false when both account name and key are not set", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = "";
        process.env.AZURE_STORAGE_ACCOUNT_KEY = "";

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.isEnabled).toBe(false);
      });

      it("should be false when account name is undefined", () => {
        // Arrange
        delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.isEnabled).toBe(false);
      });

      it("should be false when account key is undefined", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        delete process.env.AZURE_STORAGE_ACCOUNT_KEY;

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.isEnabled).toBe(false);
      });
    });

    describe("isPrivate", () => {
      it("should be true when AZURE_STORAGE_IS_PRIVATE is set", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
        process.env.AZURE_STORAGE_IS_PRIVATE = "true";

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.isPrivate).toBe(true);
      });

      it("should be false when AZURE_STORAGE_IS_PRIVATE is not set", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
        delete process.env.AZURE_STORAGE_IS_PRIVATE;

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.isPrivate).toBe(false);
      });

      it("should be false when AZURE_STORAGE_IS_PRIVATE is empty string", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
        process.env.AZURE_STORAGE_IS_PRIVATE = "";

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.isPrivate).toBe(false);
      });

      it("should be true when AZURE_STORAGE_IS_PRIVATE is any truthy value", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
        process.env.AZURE_STORAGE_IS_PRIVATE = "1";

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.isPrivate).toBe(true);
      });
    });

    describe("hostName", () => {
      it("should construct hostName from account name", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = "myaccount";
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.hostName).toBe("myaccount.blob.core.windows.net");
      });

      it("should be empty string when account name is not set", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = "";
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.hostName).toBe("");
      });
    });

    describe("sasReadExpiryMinutes", () => {
      it("should use default value (15) when not set", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
        delete process.env.AZURE_STORAGE_SAS_READ_EXPIRY_MINUTES;

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(15);
      });

      it("should parse valid positive integer from environment", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
        process.env.AZURE_STORAGE_SAS_READ_EXPIRY_MINUTES = "30";

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(30);
      });

      it("should use default when value is NaN", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
        process.env.AZURE_STORAGE_SAS_READ_EXPIRY_MINUTES = "invalid";

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(15);
      });

      it("should use default when value is zero", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
        process.env.AZURE_STORAGE_SAS_READ_EXPIRY_MINUTES = "0";

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(15);
      });

      it("should use default when value is negative", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
        process.env.AZURE_STORAGE_SAS_READ_EXPIRY_MINUTES = "-5";

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(15);
      });

      it("should parse large positive values", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
        process.env.AZURE_STORAGE_SAS_READ_EXPIRY_MINUTES = "1440"; // 24 hours

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(1440);
      });

      it("should parse decimal strings as integers (truncated)", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
        process.env.AZURE_STORAGE_SAS_READ_EXPIRY_MINUTES = "30.5";

        // Act
        const config = getStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(30);
      });
    });

    describe("config immutability", () => {
      it("should return a frozen object", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;

        // Act
        const config = getStorageConfig();

        // Assert
        expect(Object.isFrozen(config)).toBe(true);
      });

      it("should return a new object each call", () => {
        // Arrange
        process.env.AZURE_STORAGE_ACCOUNT_NAME = mockAccountName;
        process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;

        // Act
        const config1 = getStorageConfig();
        const config2 = getStorageConfig();

        // Assert - should be different objects but equal values
        expect(config1).not.toBe(config2);
        expect(config1).toEqual(config2);
        expect(Object.isFrozen(config1)).toBe(true);
        expect(Object.isFrozen(config2)).toBe(true);
      });
    });
  });

  describe("getContainerNames", () => {
    describe("USER_FILES", () => {
      it("should use default value when not set", () => {
        // Arrange
        delete process.env.USER_FILES_STORAGE_CONTAINER_NAME;

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.USER_FILES).toBe("user-files");
      });

      it("should use custom value when set", () => {
        // Arrange
        process.env.USER_FILES_STORAGE_CONTAINER_NAME = "custom-user-files";

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.USER_FILES).toBe("custom-user-files");
      });

      it("should use custom value even when empty string", () => {
        // Arrange
        process.env.USER_FILES_STORAGE_CONTAINER_NAME = "";

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.USER_FILES).toBe("");
      });
    });

    describe("CONTENT", () => {
      it("should use default value when not set", () => {
        // Arrange
        delete process.env.CONTENT_STORAGE_CONTAINER_NAME;

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.CONTENT).toBe("content");
      });

      it("should use custom value when set", () => {
        // Arrange
        process.env.CONTENT_STORAGE_CONTAINER_NAME = "custom-content";

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.CONTENT).toBe("custom-content");
      });

      it("should use custom value even when empty string", () => {
        // Arrange
        process.env.CONTENT_STORAGE_CONTAINER_NAME = "";

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.CONTENT).toBe("");
      });
    });

    describe("both containers", () => {
      it("should use both custom values when both are set", () => {
        // Arrange
        process.env.USER_FILES_STORAGE_CONTAINER_NAME = "my-user-files";
        process.env.CONTENT_STORAGE_CONTAINER_NAME = "my-content";

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.USER_FILES).toBe("my-user-files");
        expect(containerNames.CONTENT).toBe("my-content");
      });

      it("should use defaults when neither is set", () => {
        // Arrange
        delete process.env.USER_FILES_STORAGE_CONTAINER_NAME;
        delete process.env.CONTENT_STORAGE_CONTAINER_NAME;

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.USER_FILES).toBe("user-files");
        expect(containerNames.CONTENT).toBe("content");
      });

      it("should return a frozen object", () => {
        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(Object.isFrozen(containerNames)).toBe(true);
      });

      it("should return a new object each call", () => {
        // Act
        const containerNames1 = getContainerNames();
        const containerNames2 = getContainerNames();

        // Assert - should be different objects but equal values
        expect(containerNames1).not.toBe(containerNames2);
        expect(containerNames1).toEqual(containerNames2);
        expect(Object.isFrozen(containerNames1)).toBe(true);
        expect(Object.isFrozen(containerNames2)).toBe(true);
      });
    });
  });
});

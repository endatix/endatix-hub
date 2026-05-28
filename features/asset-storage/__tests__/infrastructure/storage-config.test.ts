import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type AzureStorageConfig,
  createStorageConfigClient,
  getContainerNames,
  getContainerUrl,
  getAzureStorageConfig,
} from "@endatix/storage-azure";
import {
  MisconfigurationError,
  MissingConfigurationError,
} from "@/lib/hosting/storage-configuration-errors";
import { IMAGE_SERVICE_CONFIG } from "../../infrastructure/image-service";

function setAzureEnabledEnv(
  accountName = "mock-account-name",
  publicHost = `${accountName}.blob.core.windows.net`,
): void {
  process.env.STORAGE_AZURE_ACCOUNT_NAME = accountName;
  process.env.STORAGE_AZURE_ACCOUNT_KEY = "mock-account-key";
  process.env.STORAGE_AZURE_ENDPOINT = publicHost;
}

describe("AzureStorageConfig", () => {
  const mockAccountName = "mock-account-name";
  const mockAccountKey = "mock-account-key";
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.STORAGE_PROVIDER;
    delete process.env.STORAGE_AZURE_ACCOUNT_NAME;
    delete process.env.STORAGE_AZURE_ACCOUNT_KEY;
    delete process.env.STORAGE_AZURE_ENDPOINT;
    delete process.env.STORAGE_IS_PRIVATE;
    delete process.env.STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES;
    delete process.env.STORAGE_AZURE_SAS_WRITE_EXPIRY_SECONDS;
    delete process.env.STORAGE_USER_FILES_CONTAINER_NAME;
    delete process.env.STORAGE_CONTENT_FILES_CONTAINER_NAME;
    delete process.env.USER_FILES_STORAGE_CONTAINER_NAME;
    delete process.env.CONTENT_STORAGE_CONTAINER_NAME;
    delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
    delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
    delete process.env.AZURE_STORAGE_CUSTOM_DOMAIN;
    delete process.env.AZURE_STORAGE_IS_PRIVATE;
  });

  describe("getAzureStorageConfig", () => {
    describe("isEnabled", () => {
      it("should be true when account name and key are set", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.isEnabled).toBe(true);
        expect(config.accountName).toBe(mockAccountName);
        expect(config.accountKey).toBe("mock-account-key");
        expect(config.hostName).toBe(
          `${mockAccountName}.blob.core.windows.net`,
        );
      });

      it("should be false when account name is not set", () => {
        // Arrange
        process.env.STORAGE_AZURE_ACCOUNT_NAME = "";
        process.env.STORAGE_AZURE_ACCOUNT_KEY = mockAccountKey;

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.isEnabled).toBe(false);
        expect(config.accountName).toBe("");
        expect(config.hostName).toBe("");
      });

      it("should be false when account key is not set", () => {
        // Arrange
        process.env.STORAGE_AZURE_ACCOUNT_NAME = mockAccountName;
        process.env.STORAGE_AZURE_ACCOUNT_KEY = "";

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.isEnabled).toBe(false);
        expect(config.accountKey).toBe("");
      });

      it("should be false when both account name and key are not set", () => {
        // Arrange
        process.env.STORAGE_AZURE_ACCOUNT_NAME = "";
        process.env.STORAGE_AZURE_ACCOUNT_KEY = "";

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.isEnabled).toBe(false);
      });

      it("should be false when account name is undefined", () => {
        // Arrange
        delete process.env.STORAGE_AZURE_ACCOUNT_NAME;
        process.env.STORAGE_AZURE_ACCOUNT_KEY = mockAccountKey;

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.isEnabled).toBe(false);
      });

      it("should be false when account key is undefined", () => {
        // Arrange
        process.env.STORAGE_AZURE_ACCOUNT_NAME = mockAccountName;
        delete process.env.STORAGE_AZURE_ACCOUNT_KEY;

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.isEnabled).toBe(false);
      });
    });

    describe("isPrivate", () => {
      it("should default to private when STORAGE_IS_PRIVATE is not set", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        delete process.env.STORAGE_IS_PRIVATE;

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.isPrivate).toBe(true);
      });

      it("should be false when STORAGE_IS_PRIVATE is false", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        process.env.STORAGE_IS_PRIVATE = "false";

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.isPrivate).toBe(false);
      });

      it("should remain private when STORAGE_IS_PRIVATE is empty string", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        process.env.STORAGE_IS_PRIVATE = "";

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.isPrivate).toBe(true);
      });

      it("treats any value other than 'false' as private (fail-secure default)", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        process.env.STORAGE_IS_PRIVATE = "1";

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.isPrivate).toBe(true);
      });

      it("uses AZURE_STORAGE_IS_PRIVATE as legacy fallback", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        process.env.STORAGE_PROVIDER = "azure";
        process.env.AZURE_STORAGE_IS_PRIVATE = "false";

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.isPrivate).toBe(false);
      });

      it("uses STORAGE_IS_PRIVATE before AZURE_STORAGE_IS_PRIVATE", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        process.env.STORAGE_IS_PRIVATE = "true";
        process.env.AZURE_STORAGE_IS_PRIVATE = "false";

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.isPrivate).toBe(true);
      });
    });

    describe("hostName", () => {
      it("throws MissingConfigurationError when enabled without STORAGE_AZURE_ENDPOINT", () => {
        process.env.STORAGE_AZURE_ACCOUNT_NAME = "myaccount";
        process.env.STORAGE_AZURE_ACCOUNT_KEY = mockAccountKey;
        delete process.env.STORAGE_AZURE_ENDPOINT;

        expect(() => getAzureStorageConfig()).toThrow(
          MissingConfigurationError,
        );
      });

      it("should be empty string when account name is not set", () => {
        process.env.STORAGE_AZURE_ACCOUNT_NAME = "";
        process.env.STORAGE_AZURE_ACCOUNT_KEY = mockAccountKey;
        delete process.env.STORAGE_AZURE_ENDPOINT;

        const config = getAzureStorageConfig();
        expect(config.hostName).toBe("");
      });

      it("should use endpoint when STORAGE_AZURE_ENDPOINT is set", () => {
        setAzureEnabledEnv("myaccount", "cdn.example.com");

        const config = getAzureStorageConfig();
        expect(config.hostName).toBe("cdn.example.com");
      });

      it("should trim whitespace from custom domain", () => {
        setAzureEnabledEnv("myaccount", "  cdn.example.com  ");

        const config = getAzureStorageConfig();
        expect(config.hostName).toBe("cdn.example.com");
      });

      it("should resolve host when custom domain includes https:// protocol", () => {
        setAzureEnabledEnv("myaccount", "https://cdn.example.com");

        const config = getAzureStorageConfig();
        expect(config.hostName).toBe("cdn.example.com");
      });

      it("should resolve host when custom domain includes http:// protocol", () => {
        setAzureEnabledEnv("myaccount", "http://cdn.example.com");

        const config = getAzureStorageConfig();
        expect(config.hostName).toBe("cdn.example.com");
      });

      it("should resolve host when custom domain includes protocol with path", () => {
        setAzureEnabledEnv("myaccount", "https://cdn.example.com/path");

        const config = getAzureStorageConfig();
        expect(config.hostName).toBe("cdn.example.com");
      });

      it("should include non-default port in host when custom domain specifies port", () => {
        setAzureEnabledEnv("myaccount", "https://cdn.example.com:9443");

        const config = getAzureStorageConfig();
        expect(config.hostName).toBe("cdn.example.com:9443");
      });

      it("throws MisconfigurationError when custom domain is invalid", () => {
        setAzureEnabledEnv("myaccount", "https://invalid url");

        expect(() => getAzureStorageConfig()).toThrow(MisconfigurationError);
      });

      it("throws MisconfigurationError when custom domain is malformed", () => {
        setAzureEnabledEnv("myaccount", "not a valid url://");

        expect(() => getAzureStorageConfig()).toThrow(MisconfigurationError);
      });
    });

    describe("protocol", () => {
      it("should default to https", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.protocol).toBe("https");
      });

      it("should always be https regardless of environment", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.protocol).toBe("https");
        expect(config.protocol).not.toBe("http");
      });
    });

    describe("sasReadExpiryMinutes", () => {
      it("should use default value (15) when not set", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        delete process.env.STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES;

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(15);
      });

      it("should parse valid positive integer from environment", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        process.env.STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES = "30";

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(30);
      });

      it("should use default when value is NaN", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        process.env.STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES = "invalid";

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(15);
      });

      it("should use default when value is zero", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        process.env.STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES = "0";

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(15);
      });

      it("should use default when value is negative", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        process.env.STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES = "-5";

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(15);
      });

      it("should parse large positive values", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        process.env.STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES = "1440"; // 24 hours

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(1440);
      });

      it("should parse decimal strings as integers (truncated)", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        process.env.STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES = "30.5";

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(config.sasReadExpiryMinutes).toBe(30);
      });
    });

    describe("config immutability", () => {
      it("should return a frozen object", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);

        // Act
        const config = getAzureStorageConfig();

        // Assert
        expect(Object.isFrozen(config)).toBe(true);
      });

      it("should return a new object each call", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);

        // Act
        const config1 = getAzureStorageConfig();
        const config2 = getAzureStorageConfig();

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
        delete process.env.STORAGE_USER_FILES_CONTAINER_NAME;

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.USER_FILES).toBe("user-files");
      });

      it("should use custom value when set", () => {
        // Arrange
        process.env.STORAGE_USER_FILES_CONTAINER_NAME = "custom-user-files";

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.USER_FILES).toBe("custom-user-files");
      });

      it("should use legacy value when canonical is empty string", () => {
        // Arrange
        process.env.STORAGE_USER_FILES_CONTAINER_NAME = "";
        process.env.USER_FILES_STORAGE_CONTAINER_NAME = "legacy-user-files";

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.USER_FILES).toBe("legacy-user-files");
      });
    });

    describe("CONTENT", () => {
      it("should use default value when not set", () => {
        // Arrange
        delete process.env.STORAGE_CONTENT_FILES_CONTAINER_NAME;

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.CONTENT).toBe("content");
      });

      it("should use custom value when set", () => {
        // Arrange
        process.env.STORAGE_CONTENT_FILES_CONTAINER_NAME = "custom-content";

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.CONTENT).toBe("custom-content");
      });

      it("should use legacy value when canonical is empty string", () => {
        // Arrange
        process.env.STORAGE_CONTENT_FILES_CONTAINER_NAME = "";
        process.env.CONTENT_STORAGE_CONTAINER_NAME = "legacy-content";

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.CONTENT).toBe("legacy-content");
      });
    });

    describe("both containers", () => {
      it("should use both custom values when both are set", () => {
        // Arrange
        process.env.STORAGE_USER_FILES_CONTAINER_NAME = "my-user-files";
        process.env.STORAGE_CONTENT_FILES_CONTAINER_NAME = "my-content";

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.USER_FILES).toBe("my-user-files");
        expect(containerNames.CONTENT).toBe("my-content");
      });

      it("should prefer canonical values over legacy values", () => {
        // Arrange
        process.env.STORAGE_USER_FILES_CONTAINER_NAME = "my-user-files";
        process.env.STORAGE_CONTENT_FILES_CONTAINER_NAME = "my-content";
        process.env.USER_FILES_STORAGE_CONTAINER_NAME = "legacy-user-files";
        process.env.CONTENT_STORAGE_CONTAINER_NAME = "legacy-content";

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.USER_FILES).toBe("my-user-files");
        expect(containerNames.CONTENT).toBe("my-content");
      });

      it("should use legacy values when canonical values are missing", () => {
        // Arrange
        process.env.USER_FILES_STORAGE_CONTAINER_NAME = "legacy-user-files";
        process.env.CONTENT_STORAGE_CONTAINER_NAME = "legacy-content";

        // Act
        const containerNames = getContainerNames();

        // Assert
        expect(containerNames.USER_FILES).toBe("legacy-user-files");
        expect(containerNames.CONTENT).toBe("legacy-content");
      });

      it("should use defaults when neither is set", () => {
        // Arrange
        delete process.env.STORAGE_USER_FILES_CONTAINER_NAME;
        delete process.env.STORAGE_CONTENT_FILES_CONTAINER_NAME;

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

  describe("createStorageConfigClient", () => {
    it("should return a client-safe config object", () => {
      // Arrange
      setAzureEnabledEnv(mockAccountName);
      process.env.STORAGE_IS_PRIVATE = "true";
      process.env.STORAGE_USER_FILES_CONTAINER_NAME = "custom-user-files";
      process.env.STORAGE_CONTENT_FILES_CONTAINER_NAME = "custom-content";

      // Act
      const clientConfig = createStorageConfigClient();

      // Assert
      expect(clientConfig.config).toBeDefined();
      expect(clientConfig.config.isEnabled).toBe(true);
      expect(clientConfig.config.isPrivate).toBe(true);
      expect(clientConfig.config.hostName).toBe(
        `${mockAccountName}.blob.core.windows.net`,
      );
      expect(clientConfig.config.containerNames.USER_FILES).toBe(
        "custom-user-files",
      );
      expect(clientConfig.config.containerNames.CONTENT).toBe("custom-content");
      expect(clientConfig.config.protocol).toBe("https");

      // Verify server-only properties are NOT present
      expect(
        (clientConfig.config as unknown as AzureStorageConfig).accountKey,
      ).toBeUndefined();
      expect(
        (clientConfig.config as unknown as AzureStorageConfig).accountName,
      ).toBeUndefined();
    });

    it("should use custom domain hostname when STORAGE_AZURE_ENDPOINT is set", () => {
      // Arrange
      setAzureEnabledEnv(mockAccountName, "cdn.example.com");

      // Act
      const clientConfig = createStorageConfigClient();

      // Assert
      expect(clientConfig.config.hostName).toBe("cdn.example.com");
    });

    it("should return a frozen object", () => {
      // Act
      const clientConfig = createStorageConfigClient();

      // Assert
      expect(Object.isFrozen(clientConfig)).toBe(true);
    });
  });

  describe("getContainerUrl", () => {
    describe("with AzureStorageConfig", () => {
      it("should construct URL with https protocol", () => {
        // Arrange
        const config: AzureStorageConfig = {
          isEnabled: true,
          isPrivate: true,
          accountName: "testaccount",
          accountKey: "testkey",
          hostName: "testaccount.blob.core.windows.net",
          protocol: "https",
          sasReadExpiryMinutes: 15,
          imageConfig: IMAGE_SERVICE_CONFIG,
          containerNames: {
            USER_FILES: "user-files",
            CONTENT: "content",
          },
        };

        // Act
        const url = getContainerUrl("content", config);

        // Assert
        expect(url).toBe("https://testaccount.blob.core.windows.net/content");
      });

      it("should construct URL with http protocol when provided", () => {
        // Arrange
        const config: AzureStorageConfig = {
          isEnabled: true,
          isPrivate: true,
          accountName: "testaccount",
          accountKey: "testkey",
          hostName: "testaccount.blob.core.windows.net",
          protocol: "http",
          sasReadExpiryMinutes: 15,
          imageConfig: IMAGE_SERVICE_CONFIG,
          containerNames: {
            USER_FILES: "user-files",
            CONTENT: "content",
          },
        };

        // Act
        const url = getContainerUrl("user-files", config);

        // Assert
        expect(url).toBe("http://testaccount.blob.core.windows.net/user-files");
      });

      it("should handle container names with special characters", () => {
        // Arrange
        const config: AzureStorageConfig = {
          isEnabled: true,
          isPrivate: true,
          accountName: "testaccount",
          accountKey: "testkey",
          hostName: "testaccount.blob.core.windows.net",
          protocol: "https",
          sasReadExpiryMinutes: 15,
          imageConfig: IMAGE_SERVICE_CONFIG,
          containerNames: {
            USER_FILES: "user-files",
            CONTENT: "content",
          },
        };

        // Act
        const url = getContainerUrl("my-container-123", config);

        // Assert
        expect(url).toBe(
          "https://testaccount.blob.core.windows.net/my-container-123",
        );
      });

      it("should handle empty container name", () => {
        // Arrange
        const config: AzureStorageConfig = {
          isEnabled: true,
          isPrivate: true,
          accountName: "testaccount",
          accountKey: "testkey",
          hostName: "testaccount.blob.core.windows.net",
          protocol: "https",
          sasReadExpiryMinutes: 15,
          imageConfig: IMAGE_SERVICE_CONFIG,
          containerNames: {
            USER_FILES: "user-files",
            CONTENT: "content",
          },
        };

        // Act
        const url = getContainerUrl("", config);

        // Assert
        expect(url).toBe("https://testaccount.blob.core.windows.net/");
      });

      it("should handle empty hostName", () => {
        // Arrange
        const config: AzureStorageConfig = {
          isEnabled: false,
          isPrivate: false,
          accountName: "",
          accountKey: "",
          hostName: "",
          protocol: "https",
          sasReadExpiryMinutes: 15,
          imageConfig: IMAGE_SERVICE_CONFIG,
          containerNames: {
            USER_FILES: "user-files",
            CONTENT: "content",
          },
        };

        // Act
        const url = getContainerUrl("content", config);

        // Assert
        expect(url).toBe("https:///content");
      });
    });

    describe("with ClientStorageConfig (client config)", () => {
      it("should construct URL with https protocol from client config", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        const clientConfig = createStorageConfigClient();

        // Act
        const url = getContainerUrl("content", clientConfig.config);

        // Assert
        expect(url).toBe(
          `https://${mockAccountName}.blob.core.windows.net/content`,
        );
      });

      it("should work with both container types from client config", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        const clientConfig = createStorageConfigClient();

        // Act
        const contentUrl = getContainerUrl(
          clientConfig.config.containerNames.CONTENT,
          clientConfig.config,
        );
        const userFilesUrl = getContainerUrl(
          clientConfig.config.containerNames.USER_FILES,
          clientConfig.config,
        );

        // Assert
        expect(contentUrl).toBe(
          `https://${mockAccountName}.blob.core.windows.net/content`,
        );
        expect(userFilesUrl).toBe(
          `https://${mockAccountName}.blob.core.windows.net/user-files`,
        );
      });

      it("should use protocol from client config", () => {
        // Arrange
        setAzureEnabledEnv(mockAccountName);
        const clientConfig = createStorageConfigClient();

        // Act
        const url = getContainerUrl("test-container", clientConfig.config);

        // Assert
        expect(url).toMatch(/^https:\/\//);
        expect(clientConfig.config.protocol).toBe("https");
      });
    });

    describe("edge cases", () => {
      it("should handle container names with uppercase letters", () => {
        // Arrange
        const config: AzureStorageConfig = {
          isEnabled: true,
          isPrivate: true,
          accountName: "testaccount",
          accountKey: "testkey",
          hostName: "testaccount.blob.core.windows.net",
          protocol: "https",
          sasReadExpiryMinutes: 15,
          imageConfig: IMAGE_SERVICE_CONFIG,
          containerNames: {
            USER_FILES: "user-files",
            CONTENT: "content",
          },
        };

        // Act
        const url = getContainerUrl("MY-CONTAINER", config);

        // Assert
        expect(url).toBe(
          "https://testaccount.blob.core.windows.net/MY-CONTAINER",
        );
      });

      it("should handle container names with underscores", () => {
        // Arrange
        const config: AzureStorageConfig = {
          isEnabled: true,
          isPrivate: true,
          accountName: "testaccount",
          accountKey: "testkey",
          hostName: "testaccount.blob.core.windows.net",
          protocol: "https",
          sasReadExpiryMinutes: 15,
          imageConfig: IMAGE_SERVICE_CONFIG,
          containerNames: {
            USER_FILES: "user-files",
            CONTENT: "content",
          },
        };

        // Act
        const url = getContainerUrl("my_container_name", config);

        // Assert
        expect(url).toBe(
          "https://testaccount.blob.core.windows.net/my_container_name",
        );
      });

      it("should handle very long container names", () => {
        // Arrange
        const config: AzureStorageConfig = {
          isEnabled: true,
          isPrivate: true,
          accountName: "testaccount",
          accountKey: "testkey",
          hostName: "testaccount.blob.core.windows.net",
          protocol: "https",
          sasReadExpiryMinutes: 15,
          imageConfig: IMAGE_SERVICE_CONFIG,
          containerNames: {
            USER_FILES: "user-files",
            CONTENT: "content",
          },
        };
        const longContainerName = "a".repeat(100);

        // Act
        const url = getContainerUrl(longContainerName, config);

        // Assert
        expect(url).toBe(
          `https://testaccount.blob.core.windows.net/${longContainerName}`,
        );
      });
    });
  });
});

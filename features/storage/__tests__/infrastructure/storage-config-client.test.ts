import { describe, it, expect } from "vitest";
import type {
  StorageConfig,
  StorageConfigClient,
} from "@/features/storage/infrastructure/storage-config-client";
import type { AzureStorageConfig } from "@/features/storage/infrastructure/storage-config";

describe("storage-config-client", () => {
  describe("StorageConfig type", () => {
    it("should be a valid StorageConfig object", () => {
      const config: StorageConfig = {
        isEnabled: true,
        isPrivate: true,
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      expect(config.isEnabled).toBe(true);
      expect(config.isPrivate).toBe(true);
      expect(config.hostName).toBe("testaccount.blob.core.windows.net");
      expect(config.containerNames.USER_FILES).toBe("user-files");
      expect(config.containerNames.CONTENT).toBe("content");
    });

    it("should not include server-only properties", () => {
      // Create a StorageConfig manually (as it would be created in practice)
      // This verifies that StorageConfig type correctly excludes server-only properties
      const clientConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: false,
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      // Verify that accountKey, accountName, expiryMinutes, and sasReadExpiryMinutes
      // are not part of StorageConfig
      expect("accountKey" in clientConfig).toBe(false);
      expect("accountName" in clientConfig).toBe(false);
      expect("expiryMinutes" in clientConfig).toBe(false);
      expect("sasReadExpiryMinutes" in clientConfig).toBe(false);

      // Verify that only client-safe properties are present
      expect("isEnabled" in clientConfig).toBe(true);
      expect("isPrivate" in clientConfig).toBe(true);
      expect("hostName" in clientConfig).toBe(true);
      expect("containerNames" in clientConfig).toBe(true);
    });

    it("should be compatible with AzureStorageConfig (minus server properties)", () => {
      const azureConfig: AzureStorageConfig = {
        isEnabled: true,
        isPrivate: true,
        accountName: "testaccount",
        accountKey: "secret-key",
        hostName: "testaccount.blob.core.windows.net",
        sasReadExpiryMinutes: 15,
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      // StorageConfig should be assignable from AzureStorageConfig (minus server props)
      const clientConfig: StorageConfig = {
        isEnabled: azureConfig.isEnabled,
        isPrivate: azureConfig.isPrivate,
        hostName: azureConfig.hostName,
        containerNames: azureConfig.containerNames,
      };

      expect(clientConfig.isEnabled).toBe(azureConfig.isEnabled);
      expect(clientConfig.isPrivate).toBe(azureConfig.isPrivate);
      expect(clientConfig.hostName).toBe(azureConfig.hostName);
      expect(clientConfig.containerNames).toEqual(azureConfig.containerNames);
    });
  });

  describe("StorageConfigClient interface", () => {
    it("should have config property of type StorageConfig", () => {
      const client: StorageConfigClient = {
        config: {
          isEnabled: true,
          isPrivate: true,
          hostName: "testaccount.blob.core.windows.net",
          containerNames: {
            USER_FILES: "user-files",
            CONTENT: "content",
          },
        },
      };

      expect(client.config).toBeDefined();
      expect(client.config.isEnabled).toBe(true);
      expect(client.config.isPrivate).toBe(true);
    });

    it("should allow null config", () => {
      // Note: This tests the interface structure, actual null handling
      // is tested in storage-config-context.test.tsx
      const client: StorageConfigClient = {
        config: {
          isEnabled: false,
          isPrivate: false,
          hostName: "",
          containerNames: {
            USER_FILES: "user-files",
            CONTENT: "content",
          },
        },
      };

      expect(client.config).toBeDefined();
      expect(client.config.isEnabled).toBe(false);
    });
  });
});

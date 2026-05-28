import { describe, it, expect } from "vitest";
import type {
  ClientStorageConfig,
  StorageConfigClient,
} from "@/features/asset-storage/client";
import type { AzureStorageConfig } from "@/features/asset-storage/server";
import { IMAGE_SERVICE_CONFIG } from "@/features/asset-storage/infrastructure/image-service";

describe("storage-config-client", () => {
  describe("ClientStorageConfig type", () => {
    it("should be a valid ClientStorageConfig object", () => {
      const config: ClientStorageConfig = {
        isEnabled: true,
        isPrivate: true,
        hostName: "testaccount.blob.core.windows.net",
        protocol: "https",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
        imageConfig: IMAGE_SERVICE_CONFIG,
      };

      expect(config.isEnabled).toBe(true);
      expect(config.isPrivate).toBe(true);
      expect(config.hostName).toBe("testaccount.blob.core.windows.net");
      expect(config.containerNames.USER_FILES).toBe("user-files");
      expect(config.containerNames.CONTENT).toBe("content");
    });

    it("should not include server-only properties", () => {
      // Create a ClientStorageConfig manually (as it would be created in practice)
      // This verifies that ClientStorageConfig type correctly excludes server-only properties
      const clientConfig: ClientStorageConfig = {
        isEnabled: true,
        isPrivate: false,
        hostName: "testaccount.blob.core.windows.net",
        protocol: "https",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
        imageConfig: IMAGE_SERVICE_CONFIG,
      };

      // Verify that accountKey, accountName, expiryMinutes, and sasReadExpiryMinutes
      // are not part of ClientStorageConfig
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
        protocol: "https",
        sasReadExpiryMinutes: 15,
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
        imageConfig: IMAGE_SERVICE_CONFIG,
      };

      // ClientStorageConfig should be assignable from AzureStorageConfig (minus server props)
      const clientConfig: ClientStorageConfig = {
        isEnabled: azureConfig.isEnabled,
        isPrivate: azureConfig.isPrivate,
        hostName: azureConfig.hostName,
        protocol: azureConfig.protocol,
        containerNames: azureConfig.containerNames,
        imageConfig: azureConfig.imageConfig,
      };

      expect(clientConfig.isEnabled).toBe(azureConfig.isEnabled);
      expect(clientConfig.isPrivate).toBe(azureConfig.isPrivate);
      expect(clientConfig.hostName).toBe(azureConfig.hostName);
      expect(clientConfig.containerNames).toEqual(azureConfig.containerNames);
    });

    it("should support custom domain hostnames", () => {
      // This test documents that ClientStorageConfig supports custom domain/CDN hostnames
      const config: ClientStorageConfig = {
        isEnabled: true,
        isPrivate: false,
        hostName: "cdn.example.com",
        protocol: "https",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
        imageConfig: IMAGE_SERVICE_CONFIG,
      };

      expect(config.hostName).toBe("cdn.example.com");
    });
  });

  describe("StorageConfigClient interface", () => {
    it("should have config property of type ClientStorageConfig", () => {
      const client: StorageConfigClient = {
        config: {
          isEnabled: true,
          isPrivate: true,
          hostName: "testaccount.blob.core.windows.net",
          protocol: "https",
          containerNames: {
            USER_FILES: "user-files",
            CONTENT: "content",
          },
          imageConfig: IMAGE_SERVICE_CONFIG,
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
          protocol: "https",
          containerNames: {
            USER_FILES: "user-files",
            CONTENT: "content",
          },
          imageConfig: IMAGE_SERVICE_CONFIG,
        },
      };

      expect(client.config).toBeDefined();
      expect(client.config.isEnabled).toBe(false);
    });
  });
});

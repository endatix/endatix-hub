import { beforeEach, describe, expect, it } from "vitest";
import { getAzureStorageConfig } from "@endatix/storage-azure";
import {
  MisconfigurationError,
  MissingConfigurationError,
} from "@/lib/hosting/storage-configuration-errors";

describe("getAzureStorageConfig explicit public host", () => {
  const originalEnv = { ...process.env };
  const mockAccountKey = "mock-key";

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AZURE_STORAGE_CUSTOM_DOMAIN;
  });

  it("throws MissingConfigurationError when enabled without AZURE_STORAGE_CUSTOM_DOMAIN", () => {
    process.env.AZURE_STORAGE_ACCOUNT_NAME = "myaccount";
    process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;

    expect(() => getAzureStorageConfig()).toThrow(MissingConfigurationError);
  });

  it("throws MisconfigurationError when custom domain is invalid", () => {
    process.env.AZURE_STORAGE_ACCOUNT_NAME = "myaccount";
    process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
    process.env.AZURE_STORAGE_CUSTOM_DOMAIN = "https://invalid url";

    expect(() => getAzureStorageConfig()).toThrow(MisconfigurationError);
  });

  it("resolves host from explicit custom domain", () => {
    process.env.AZURE_STORAGE_ACCOUNT_NAME = "myaccount";
    process.env.AZURE_STORAGE_ACCOUNT_KEY = mockAccountKey;
    process.env.AZURE_STORAGE_CUSTOM_DOMAIN = "https://cdn.example.com";

    const config = getAzureStorageConfig();
    expect(config.hostName).toBe("cdn.example.com");
    expect(config.protocol).toBe("https");
  });
});

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
    delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
    delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
    delete process.env.AZURE_STORAGE_CUSTOM_DOMAIN;
    delete process.env.AZURE_STORAGE_SAS_TOKEN_EXPIRY_MINUTES;
    delete process.env.STORAGE_AZURE_ACCOUNT_NAME;
    delete process.env.STORAGE_AZURE_ACCOUNT_KEY;
    delete process.env.STORAGE_AZURE_ENDPOINT;
    delete process.env.STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES;
    delete process.env.STORAGE_AZURE_SAS_WRITE_EXPIRY_SECONDS;
    delete process.env.STORAGE_PROVIDER;
    delete process.env.STORAGE_IS_PRIVATE;
    delete process.env.AZURE_STORAGE_IS_PRIVATE;
  });

  it("throws MissingConfigurationError when enabled without STORAGE_AZURE_ENDPOINT", () => {
    process.env.STORAGE_AZURE_ACCOUNT_NAME = "myaccount";
    process.env.STORAGE_AZURE_ACCOUNT_KEY = mockAccountKey;

    expect(() => getAzureStorageConfig()).toThrow(MissingConfigurationError);
  });

  it("throws MisconfigurationError when custom domain is invalid", () => {
    process.env.STORAGE_AZURE_ACCOUNT_NAME = "myaccount";
    process.env.STORAGE_AZURE_ACCOUNT_KEY = mockAccountKey;
    process.env.STORAGE_AZURE_ENDPOINT = "https://invalid url";

    expect(() => getAzureStorageConfig()).toThrow(MisconfigurationError);
  });

  it("resolves host from explicit custom domain", () => {
    process.env.STORAGE_AZURE_ACCOUNT_NAME = "myaccount";
    process.env.STORAGE_AZURE_ACCOUNT_KEY = mockAccountKey;
    process.env.STORAGE_AZURE_ENDPOINT = "https://cdn.example.com";

    const config = getAzureStorageConfig();
    expect(config.hostName).toBe("cdn.example.com");
    expect(config.protocol).toBe("https");
  });

  it("uses canonical Azure env values before legacy fallbacks", () => {
    process.env.STORAGE_AZURE_ACCOUNT_NAME = "canonical";
    process.env.STORAGE_AZURE_ACCOUNT_KEY = mockAccountKey;
    process.env.STORAGE_AZURE_ENDPOINT = "https://canonical.example.com";
    process.env.AZURE_STORAGE_ACCOUNT_NAME = "legacy";
    process.env.AZURE_STORAGE_ACCOUNT_KEY = "legacy-key";
    process.env.AZURE_STORAGE_CUSTOM_DOMAIN = "https://legacy.example.com";

    const config = getAzureStorageConfig();

    expect(config.accountName).toBe("canonical");
    expect(config.accountKey).toBe(mockAccountKey);
    expect(config.hostName).toBe("canonical.example.com");
  });

  it("falls back to legacy Azure env values", () => {
    process.env.AZURE_STORAGE_ACCOUNT_NAME = "legacy";
    process.env.AZURE_STORAGE_ACCOUNT_KEY = "legacy-key";
    process.env.AZURE_STORAGE_CUSTOM_DOMAIN = "https://legacy.example.com";

    const config = getAzureStorageConfig();

    expect(config.accountName).toBe("legacy");
    expect(config.accountKey).toBe("legacy-key");
    expect(config.hostName).toBe("legacy.example.com");
  });

  it("uses Azure legacy privacy fallback only when STORAGE_PROVIDER is azure", () => {
    process.env.STORAGE_PROVIDER = "azure";
    process.env.STORAGE_AZURE_ACCOUNT_NAME = "myaccount";
    process.env.STORAGE_AZURE_ACCOUNT_KEY = mockAccountKey;
    process.env.STORAGE_AZURE_ENDPOINT = "https://cdn.example.com";
    process.env.AZURE_STORAGE_IS_PRIVATE = "false";

    const config = getAzureStorageConfig();

    expect(config.isPrivate).toBe(false);
  });

  it("falls back to deprecated legacy Azure SAS token expiry for read URLs", () => {
    process.env.STORAGE_AZURE_ACCOUNT_NAME = "myaccount";
    process.env.STORAGE_AZURE_ACCOUNT_KEY = mockAccountKey;
    process.env.STORAGE_AZURE_ENDPOINT = "https://cdn.example.com";
    process.env.AZURE_STORAGE_SAS_TOKEN_EXPIRY_MINUTES = "45";

    const config = getAzureStorageConfig();

    expect(config.sasReadExpiryMinutes).toBe(45);
    expect(process.env.STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES).toBe("45");
  });

  it("falls back to deprecated legacy Azure SAS token expiry for write URLs", () => {
    process.env.STORAGE_AZURE_ACCOUNT_NAME = "myaccount";
    process.env.STORAGE_AZURE_ACCOUNT_KEY = mockAccountKey;
    process.env.STORAGE_AZURE_ENDPOINT = "https://cdn.example.com";
    process.env.AZURE_STORAGE_SAS_TOKEN_EXPIRY_MINUTES = "4";

    const config = getAzureStorageConfig();

    expect(config.sasWriteExpirySeconds).toBe(240);
  });

  it("uses canonical Azure write expiry before deprecated legacy token expiry", () => {
    process.env.STORAGE_AZURE_ACCOUNT_NAME = "myaccount";
    process.env.STORAGE_AZURE_ACCOUNT_KEY = mockAccountKey;
    process.env.STORAGE_AZURE_ENDPOINT = "https://cdn.example.com";
    process.env.STORAGE_AZURE_SAS_WRITE_EXPIRY_SECONDS = "120";
    process.env.AZURE_STORAGE_SAS_TOKEN_EXPIRY_MINUTES = "4";

    const config = getAzureStorageConfig();

    expect(config.sasWriteExpirySeconds).toBe(120);
  });
});

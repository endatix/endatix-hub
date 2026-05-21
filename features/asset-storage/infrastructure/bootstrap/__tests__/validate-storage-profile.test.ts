import type { StorageProfileSlice } from "@/features/config/resolve-endatix-settings";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertStorageProfileValid,
  validateStorageProfile,
} from "../validate-storage-profile";
import { MissingConfigurationError } from "@/lib/hosting/storage-configuration-errors";

describe("validateStorageProfile", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.STORAGE_PROVIDER;
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    delete process.env.STORAGE_S3_ENDPOINT;
    delete process.env.STORAGE_S3_ACCESS_KEY_ID;
    delete process.env.STORAGE_S3_SECRET_ACCESS_KEY;
    delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
    delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
    delete process.env.AZURE_STORAGE_CUSTOM_DOMAIN;
    delete process.env.STORAGE_AZURE_ACCOUNT_NAME;
    delete process.env.STORAGE_AZURE_ACCOUNT_KEY;
    delete process.env.STORAGE_AZURE_ENDPOINT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const profile = (
    overrides: Partial<StorageProfileSlice>,
  ): StorageProfileSlice => ({
    provider: "none",
    invalidProviderRaw: null,
    azureCredentialsPresent: false,
    s3CredentialsPresent: false,
    imageRemoteHostnames: [],
    ...overrides,
  });

  it("returns no errors when provider is none (including unset default)", () => {
    expect(validateStorageProfile(profile({}))).toEqual([]);
  });

  it("returns no errors when provider is explicitly none", () => {
    expect(
      validateStorageProfile(profile({ provider: "none" })),
    ).toEqual([]);
  });

  it("reports invalid STORAGE_PROVIDER value from profile", () => {
    const errors = validateStorageProfile(
      profile({ provider: "none", invalidProviderRaw: "invalid" }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("STORAGE_PROVIDER");
  });

  it("reports missing S3 credentials when STORAGE_PROVIDER=s3", () => {
    const errors = validateStorageProfile(
      profile({ provider: "s3", s3CredentialsPresent: false }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("STORAGE_S3_ENDPOINT");
  });

  it("reports invalid S3 endpoint when credentials are complete", () => {
    process.env.STORAGE_S3_ENDPOINT = "https://invalid url";
    process.env.STORAGE_S3_ACCESS_KEY_ID = "k";
    process.env.STORAGE_S3_SECRET_ACCESS_KEY = "secret";
    const errors = validateStorageProfile(
      profile({ provider: "s3", s3CredentialsPresent: true }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Invalid storage URL");
  });

  it("reports missing Azure credentials when STORAGE_PROVIDER=azure", () => {
    const errors = validateStorageProfile(
      profile({ provider: "azure", azureCredentialsPresent: false }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("STORAGE_AZURE_ACCOUNT_NAME");
    expect(errors[0]).toContain("AZURE_STORAGE_ACCOUNT_NAME");
  });

  it("reports missing STORAGE_AZURE_ENDPOINT when Azure credentials are set", () => {
    process.env.STORAGE_AZURE_ACCOUNT_NAME = "acct";
    process.env.STORAGE_AZURE_ACCOUNT_KEY = "key";
    const errors = validateStorageProfile(
      profile({ provider: "azure", azureCredentialsPresent: true }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("STORAGE_AZURE_ENDPOINT");
    expect(errors[0]).toContain("AZURE_STORAGE_CUSTOM_DOMAIN");
  });

  it("throws MissingConfigurationError via assertStorageProfileValid", () => {
    expect(() =>
      assertStorageProfileValid(
        profile({ provider: "azure", azureCredentialsPresent: false }),
      ),
    ).toThrow(MissingConfigurationError);
  });

  it("returns no errors for valid Azure configuration", () => {
    process.env.STORAGE_AZURE_ACCOUNT_NAME = "acct";
    process.env.STORAGE_AZURE_ACCOUNT_KEY = "key";
    process.env.STORAGE_AZURE_ENDPOINT = "acct.blob.core.windows.net";
    expect(
      validateStorageProfile(
        profile({ provider: "azure", azureCredentialsPresent: true }),
      ),
    ).toEqual([]);
  });

  it("returns no errors for valid legacy Azure configuration", () => {
    process.env.AZURE_STORAGE_ACCOUNT_NAME = "acct";
    process.env.AZURE_STORAGE_ACCOUNT_KEY = "key";
    process.env.AZURE_STORAGE_CUSTOM_DOMAIN = "acct.blob.core.windows.net";

    expect(
      validateStorageProfile(
        profile({ provider: "azure", azureCredentialsPresent: true }),
      ),
    ).toEqual([]);
  });
});

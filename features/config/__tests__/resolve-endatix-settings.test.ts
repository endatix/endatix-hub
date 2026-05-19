import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  resolveEndatixSettings,
  resetResolveEndatixSettingsCacheForTests,
} from "../resolve-endatix-settings";

describe("resolveEndatixSettings", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetResolveEndatixSettingsCacheForTests();
    process.env = { ...originalEnv };
    delete process.env.STORAGE_PROVIDER;
    delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
    delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
    delete process.env.AZURE_STORAGE_CUSTOM_DOMAIN;
    delete process.env.S3_PUBLIC_BASE_URL;
    delete process.env.ENDATIX_RESOLVED_STORAGE_VERSION;
    delete process.env.ENDATIX_RESOLVED_STORAGE_PROVIDER;
    delete process.env.ENDATIX_RESOLVED_AZURE_CREDENTIALS;
    delete process.env.ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES;
    delete process.env.ENDATIX_RESOLVED_S3_CREDENTIALS;
  });

  afterEach(() => {
    resetResolveEndatixSettingsCacheForTests();
    process.env = { ...originalEnv };
  });

  describe("source withEndatix", () => {
    it("reuses cached storage slice reference for env-only storage", () => {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "acct";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "key";
      const a = resolveEndatixSettings({ source: "withEndatix", options: {} });
      const b = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(a.storage).toBe(b.storage);
    });

    it("STORAGE_PROVIDER=none yields none and no Azure image hosts", () => {
      process.env.STORAGE_PROVIDER = "none";
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "acct";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "key";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.provider).toBe("none");
      expect(r.storage.invalidProviderRaw).toBeNull();
      expect(r.storage.azureCredentialsPresent).toBe(true);
      expect(r.storage.imageRemoteHostnames).toEqual([]);
      expect(r.envPatch.ENDATIX_RESOLVED_STORAGE_VERSION).toBe("2");
      expect(r.envPatch.ENDATIX_RESOLVED_STORAGE_PROVIDER).toBe("none");
    });

    it("STORAGE_PROVIDER=s3 yields s3 and no Azure image hosts", () => {
      process.env.STORAGE_PROVIDER = "s3";
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "acct";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "key";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.provider).toBe("s3");
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("STORAGE_PROVIDER=s3 adds S3_PUBLIC_BASE_URL hostname when credentials are set", () => {
      process.env.STORAGE_PROVIDER = "s3";
      process.env.S3_ENDPOINT = "http://internal:9000";
      process.env.S3_ACCESS_KEY_ID = "k";
      process.env.S3_SECRET_ACCESS_KEY = "secret";
      process.env.S3_PUBLIC_BASE_URL = "https://rust.example.com/bucket";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.imageRemoteHostnames).toEqual(["rust.example.com"]);
    });

    it("STORAGE_PROVIDER=azure with credentials", () => {
      process.env.STORAGE_PROVIDER = "azure";
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "myacct";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "secret";
      process.env.AZURE_STORAGE_CUSTOM_DOMAIN = "myacct.blob.core.windows.net";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.provider).toBe("azure");
      expect(r.storage.azureCredentialsPresent).toBe(true);
      expect(r.storage.imageRemoteHostnames).toContain(
        "myacct.blob.core.windows.net",
      );
    });

    it("STORAGE_PROVIDER=azure without credentials", () => {
      process.env.STORAGE_PROVIDER = "azure";
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.provider).toBe("azure");
      expect(r.storage.azureCredentialsPresent).toBe(false);
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("unset defaults to none and does not add Azure image hosts", () => {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "autoacct";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "k";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.provider).toBe("none");
      expect(r.storage.invalidProviderRaw).toBeNull();
      expect(r.storage.azureCredentialsPresent).toBe(true);
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("unset without credentials yields none and empty image hostnames", () => {
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.provider).toBe("none");
      expect(r.storage.azureCredentialsPresent).toBe(false);
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("unknown STORAGE_PROVIDER sets invalidProviderRaw and provider none", () => {
      process.env.STORAGE_PROVIDER = "unknown-value";
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "x";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "y";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.provider).toBe("none");
      expect(r.storage.invalidProviderRaw).toBe("unknown-value");
      expect(r.storage.azureCredentialsPresent).toBe(true);
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("S3_PUBLIC_BASE_URL adds hostname only when STORAGE_PROVIDER=s3", () => {
      process.env.STORAGE_PROVIDER = "s3";
      process.env.S3_ENDPOINT = "http://localhost:9000";
      process.env.S3_ACCESS_KEY_ID = "k";
      process.env.S3_SECRET_ACCESS_KEY = "secret";
      process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com/assets";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.imageRemoteHostnames).toEqual(["cdn.example.com"]);
    });

    it("writes ENDATIX_RESOLVED_S3_CREDENTIALS when S3 endpoint and keys are set", () => {
      process.env.STORAGE_PROVIDER = "s3";
      process.env.S3_ENDPOINT = "http://localhost:9000";
      process.env.S3_ACCESS_KEY_ID = "k";
      process.env.S3_SECRET_ACCESS_KEY = "secret";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.s3CredentialsPresent).toBe(true);
      expect(r.envPatch.ENDATIX_RESOLVED_S3_CREDENTIALS).toBe("1");
    });

    it("writes ENDATIX_RESOLVED_S3_CREDENTIALS 0 when S3 keys are incomplete", () => {
      process.env.STORAGE_PROVIDER = "s3";
      process.env.S3_ACCESS_KEY_ID = "k";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.s3CredentialsPresent).toBe(false);
      expect(r.envPatch.ENDATIX_RESOLVED_S3_CREDENTIALS).toBe("0");
    });

    it("options.api overrides env for merged API URL in envPatch", () => {
      process.env.ENDATIX_BASE_URL = "https://env.example.com";
      process.env.ENDATIX_API_PREFIX = "/api";
      const r = resolveEndatixSettings({
        source: "withEndatix",
        options: {
          api: { baseUrl: "https://opts.example.com", prefix: "/v2" },
        },
      });
      expect(r.mergedApiConfig?.apiUrl).toBe("https://opts.example.com/v2");
      expect(r.envPatch.ENDATIX_API_URL).toBe("https://opts.example.com/v2");
    });
  });

  describe("source runtime", () => {
    it("prefers ENDATIX_RESOLVED_* mirror over raw env when version is 2", () => {
      process.env.STORAGE_PROVIDER = "azure";
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "acct";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "key";
      process.env.ENDATIX_RESOLVED_STORAGE_VERSION = "2";
      process.env.ENDATIX_RESOLVED_STORAGE_PROVIDER = "none";
      process.env.ENDATIX_RESOLVED_AZURE_CREDENTIALS = "0";
      process.env.ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES = "";
      resetResolveEndatixSettingsCacheForTests();
      const r = resolveEndatixSettings({ source: "runtime" });
      expect(r.storage.provider).toBe("none");
      expect(r.storage.azureCredentialsPresent).toBe(false);
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("prefers ENDATIX_RESOLVED_S3_CREDENTIALS over live S3 env when mirror version is 2", () => {
      process.env.STORAGE_PROVIDER = "s3";
      process.env.S3_ENDPOINT = "http://localhost:9000";
      process.env.S3_ACCESS_KEY_ID = "k";
      process.env.S3_SECRET_ACCESS_KEY = "secret";
      process.env.ENDATIX_RESOLVED_STORAGE_VERSION = "2";
      process.env.ENDATIX_RESOLVED_STORAGE_PROVIDER = "s3";
      process.env.ENDATIX_RESOLVED_AZURE_CREDENTIALS = "0";
      process.env.ENDATIX_RESOLVED_S3_CREDENTIALS = "0";
      process.env.ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES = "";
      resetResolveEndatixSettingsCacheForTests();
      const r = resolveEndatixSettings({ source: "runtime" });
      expect(r.storage.s3CredentialsPresent).toBe(false);
    });

    it("mirror empty ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES does not repopulate hosts from live env", () => {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "liveacct";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "livekey";
      process.env.ENDATIX_RESOLVED_STORAGE_VERSION = "2";
      process.env.ENDATIX_RESOLVED_STORAGE_PROVIDER = "none";
      process.env.ENDATIX_RESOLVED_AZURE_CREDENTIALS = "0";
      process.env.ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES = "";
      resetResolveEndatixSettingsCacheForTests();
      const r = resolveEndatixSettings({ source: "runtime" });
      expect(r.storage.provider).toBe("none");
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("falls back to env when mirror version missing", () => {
      process.env.STORAGE_PROVIDER = "azure";
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "z";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "k";
      process.env.AZURE_STORAGE_CUSTOM_DOMAIN = "z.blob.core.windows.net";
      resetResolveEndatixSettingsCacheForTests();
      const r = resolveEndatixSettings({ source: "runtime" });
      expect(r.storage.azureCredentialsPresent).toBe(true);
      expect(r.storage.imageRemoteHostnames).toContain(
        "z.blob.core.windows.net",
      );
    });
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getClientEndatixConfig,
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
    delete process.env.STORAGE_AZURE_ACCOUNT_NAME;
    delete process.env.STORAGE_AZURE_ACCOUNT_KEY;
    delete process.env.STORAGE_AZURE_ENDPOINT;
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    delete process.env.STORAGE_S3_ENDPOINT;
    delete process.env.STORAGE_S3_ACCESS_KEY_ID;
    delete process.env.STORAGE_S3_SECRET_ACCESS_KEY;
    delete process.env.ENDATIX_RESOLVED_STORAGE_VERSION;
    delete process.env.ENDATIX_RESOLVED_STORAGE_PROVIDER;
    delete process.env.ENDATIX_RESOLVED_AZURE_CREDENTIALS;
    delete process.env.ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES;
    delete process.env.ENDATIX_RESOLVED_S3_CREDENTIALS;
    delete process.env.ENDATIX_BASE_URL;
    delete process.env.ENDATIX_API_URL;
    delete process.env.ENDATIX_API_PREFIX;
    delete process.env.ENDATIX_ENABLE_EXTENSIONS;
  });

  afterEach(() => {
    resetResolveEndatixSettingsCacheForTests();
    process.env = { ...originalEnv };
  });

  describe("source withEndatix", () => {
    it("reuses cached storage slice reference for env-only storage", () => {
      process.env.STORAGE_AZURE_ACCOUNT_NAME = "acct";
      process.env.STORAGE_AZURE_ACCOUNT_KEY = "key";
      const a = resolveEndatixSettings({ source: "withEndatix", options: {} });
      const b = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(a.storage).toBe(b.storage);
    });

    it("STORAGE_PROVIDER=none yields none and no Azure image hosts", () => {
      process.env.STORAGE_PROVIDER = "none";
      process.env.STORAGE_AZURE_ACCOUNT_NAME = "acct";
      process.env.STORAGE_AZURE_ACCOUNT_KEY = "key";
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
      process.env.STORAGE_AZURE_ACCOUNT_NAME = "acct";
      process.env.STORAGE_AZURE_ACCOUNT_KEY = "key";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.provider).toBe("s3");
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("STORAGE_PROVIDER=s3 adds STORAGE_S3_ENDPOINT hostname when credentials are set", () => {
      process.env.STORAGE_PROVIDER = "s3";
      process.env.STORAGE_S3_ENDPOINT = "https://rust.example.com";
      process.env.STORAGE_S3_ACCESS_KEY_ID = "k";
      process.env.STORAGE_S3_SECRET_ACCESS_KEY = "secret";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.imageRemoteHostnames).toEqual(["rust.example.com"]);
    });

    it("STORAGE_PROVIDER=azure with credentials", () => {
      process.env.STORAGE_PROVIDER = "azure";
      process.env.STORAGE_AZURE_ACCOUNT_NAME = "myacct";
      process.env.STORAGE_AZURE_ACCOUNT_KEY = "secret";
      process.env.STORAGE_AZURE_ENDPOINT = "myacct.blob.core.windows.net";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.provider).toBe("azure");
      expect(r.storage.azureCredentialsPresent).toBe(true);
      expect(r.storage.imageRemoteHostnames).toContain(
        "myacct.blob.core.windows.net",
      );
    });

    it("STORAGE_PROVIDER=azure without credentials", () => {
      process.env.STORAGE_PROVIDER = "azure";
      process.env.STORAGE_AZURE_ACCOUNT_NAME = "";
      process.env.STORAGE_AZURE_ACCOUNT_KEY = "";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.provider).toBe("azure");
      expect(r.storage.azureCredentialsPresent).toBe(false);
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("unset defaults to none and does not add Azure image hosts", () => {
      process.env.STORAGE_AZURE_ACCOUNT_NAME = "autoacct";
      process.env.STORAGE_AZURE_ACCOUNT_KEY = "k";
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
      process.env.STORAGE_AZURE_ACCOUNT_NAME = "x";
      process.env.STORAGE_AZURE_ACCOUNT_KEY = "y";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.provider).toBe("none");
      expect(r.storage.invalidProviderRaw).toBe("unknown-value");
      expect(r.storage.azureCredentialsPresent).toBe(true);
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("STORAGE_S3_ENDPOINT adds hostname only when STORAGE_PROVIDER=s3", () => {
      process.env.STORAGE_PROVIDER = "s3";
      process.env.STORAGE_S3_ENDPOINT = "https://cdn.example.com";
      process.env.STORAGE_S3_ACCESS_KEY_ID = "k";
      process.env.STORAGE_S3_SECRET_ACCESS_KEY = "secret";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.imageRemoteHostnames).toEqual(["cdn.example.com"]);
    });

    it("writes ENDATIX_RESOLVED_S3_CREDENTIALS when S3 endpoint and keys are set", () => {
      process.env.STORAGE_PROVIDER = "s3";
      process.env.STORAGE_S3_ENDPOINT = "http://localhost:9000";
      process.env.STORAGE_S3_ACCESS_KEY_ID = "k";
      process.env.STORAGE_S3_SECRET_ACCESS_KEY = "secret";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.s3CredentialsPresent).toBe(true);
      expect(r.envPatch.ENDATIX_RESOLVED_S3_CREDENTIALS).toBe("1");
    });

    it("writes ENDATIX_RESOLVED_S3_CREDENTIALS 0 when S3 keys are incomplete", () => {
      process.env.STORAGE_PROVIDER = "s3";
      process.env.STORAGE_S3_ACCESS_KEY_ID = "k";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.s3CredentialsPresent).toBe(false);
      expect(r.envPatch.ENDATIX_RESOLVED_S3_CREDENTIALS).toBe("0");
    });

    it("options.api overrides env for merged API URL without inlining into envPatch", () => {
      process.env.ENDATIX_BASE_URL = "https://env.example.com";
      process.env.ENDATIX_API_PREFIX = "/api";
      const r = resolveEndatixSettings({
        source: "withEndatix",
        options: {
          api: { baseUrl: "https://opts.example.com", prefix: "/v2" },
        },
      });
      expect(r.mergedApiConfig?.apiUrl).toBe("https://opts.example.com/v2");
      expect(r.envPatch.ENDATIX_API_URL).toBeUndefined();
      expect(r.envPatch.ENDATIX_ENABLE_EXTENSIONS).toBeUndefined();
    });

    it("does not put ENDATIX_API_URL or ENDATIX_ENABLE_EXTENSIONS in envPatch", () => {
      process.env.ENDATIX_BASE_URL = "https://api.example.com";
      process.env.ENDATIX_ENABLE_EXTENSIONS = "true";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.mergedApiConfig?.apiUrl).toBe("https://api.example.com/api");
      expect(r.mergedExperimentalConfig.extensions).toBe(true);
      expect(r.envPatch).not.toHaveProperty("ENDATIX_API_URL");
      expect(r.envPatch).not.toHaveProperty("ENDATIX_ENABLE_EXTENSIONS");
    });
  });

  describe("source runtime", () => {
    it("prefers ENDATIX_RESOLVED_* mirror over raw env when version is 2", () => {
      process.env.STORAGE_PROVIDER = "azure";
      process.env.STORAGE_AZURE_ACCOUNT_NAME = "acct";
      process.env.STORAGE_AZURE_ACCOUNT_KEY = "key";
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
      process.env.STORAGE_S3_ENDPOINT = "http://localhost:9000";
      process.env.STORAGE_S3_ACCESS_KEY_ID = "k";
      process.env.STORAGE_S3_SECRET_ACCESS_KEY = "secret";
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
      process.env.STORAGE_AZURE_ACCOUNT_NAME = "liveacct";
      process.env.STORAGE_AZURE_ACCOUNT_KEY = "livekey";
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
      process.env.STORAGE_AZURE_ACCOUNT_NAME = "z";
      process.env.STORAGE_AZURE_ACCOUNT_KEY = "k";
      process.env.STORAGE_AZURE_ENDPOINT = "z.blob.core.windows.net";
      resetResolveEndatixSettingsCacheForTests();
      const r = resolveEndatixSettings({ source: "runtime" });
      expect(r.storage.azureCredentialsPresent).toBe(true);
      expect(r.storage.imageRemoteHostnames).toContain(
        "z.blob.core.windows.net",
      );
    });
  });

  describe("getClientEndatixConfig", () => {
    it("projects live API URL and extensions from env", () => {
      process.env.ENDATIX_BASE_URL = "https://api.live.example.com";
      process.env.ENDATIX_ENABLE_EXTENSIONS = "true";

      const config = getClientEndatixConfig();

      expect(config.apiBaseUrl).toBe("https://api.live.example.com/api");
      expect(config.extensionsEnabled).toBe(true);
    });

    it("falls back to ENDATIX_API_URL when ENDATIX_BASE_URL is unset", () => {
      process.env.ENDATIX_API_URL = "https://helm.example.com/api";

      const config = getClientEndatixConfig();

      expect(config.apiBaseUrl).toBe("https://helm.example.com/api");
      expect(config.extensionsEnabled).toBe(false);
    });

    it("returns empty apiBaseUrl and extensions off when unset", () => {
      const config = getClientEndatixConfig();

      expect(config.apiBaseUrl).toBe("");
      expect(config.extensionsEnabled).toBe(false);
    });
  });
});

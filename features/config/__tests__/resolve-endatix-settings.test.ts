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
    delete process.env.ENDATIX_RESOLVED_STORAGE_EXPLICIT;
    delete process.env.ENDATIX_RESOLVED_AZURE_CREDENTIALS;
    delete process.env.ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES;
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
      expect(r.storage.explicitProvider).toBe("none");
      expect(r.storage.azureCredentialsPresent).toBe(true);
      expect(r.storage.imageRemoteHostnames).toEqual([]);
      expect(r.envPatch.ENDATIX_RESOLVED_STORAGE_EXPLICIT).toBe("none");
    });

    it("STORAGE_PROVIDER=s3 yields s3 and no Azure image hosts", () => {
      process.env.STORAGE_PROVIDER = "s3";
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "acct";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "key";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.explicitProvider).toBe("s3");
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("STORAGE_PROVIDER=s3 still adds S3_PUBLIC_BASE_URL hostname for images", () => {
      process.env.STORAGE_PROVIDER = "s3";
      process.env.S3_PUBLIC_BASE_URL = "https://rust.example.com/bucket";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.imageRemoteHostnames).toEqual(["rust.example.com"]);
    });

    it("STORAGE_PROVIDER=azure with credentials", () => {
      process.env.STORAGE_PROVIDER = "azure";
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "myacct";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "secret";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.explicitProvider).toBe("azure");
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
      expect(r.storage.explicitProvider).toBe("azure");
      expect(r.storage.azureCredentialsPresent).toBe(false);
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("unset with credentials auto Azure semantics and default blob hostname", () => {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "autoacct";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "k";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.explicitProvider).toBe(null);
      expect(r.storage.azureCredentialsPresent).toBe(true);
      expect(r.storage.imageRemoteHostnames).toEqual([
        "autoacct.blob.core.windows.net",
      ]);
    });

    it("unset without credentials yields empty image hostnames", () => {
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.explicitProvider).toBe(null);
      expect(r.storage.azureCredentialsPresent).toBe(false);
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("unknown STORAGE_PROVIDER behaves like unset for explicitProvider", () => {
      process.env.STORAGE_PROVIDER = "unknown-value";
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "x";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "y";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.explicitProvider).toBe(null);
      expect(r.storage.azureCredentialsPresent).toBe(true);
    });

    it("appends S3_PUBLIC_BASE_URL hostname when set", () => {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "a";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "b";
      process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com/assets";
      const r = resolveEndatixSettings({ source: "withEndatix", options: {} });
      expect(r.storage.imageRemoteHostnames).toContain(
        "a.blob.core.windows.net",
      );
      expect(r.storage.imageRemoteHostnames).toContain("cdn.example.com");
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
    it("prefers ENDATIX_RESOLVED_* mirror over raw env when version is 1", () => {
      process.env.STORAGE_PROVIDER = "azure";
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "acct";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "key";
      process.env.ENDATIX_RESOLVED_STORAGE_VERSION = "1";
      process.env.ENDATIX_RESOLVED_STORAGE_EXPLICIT = "none";
      process.env.ENDATIX_RESOLVED_AZURE_CREDENTIALS = "0";
      process.env.ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES = "";
      resetResolveEndatixSettingsCacheForTests();
      const r = resolveEndatixSettings({ source: "runtime" });
      expect(r.storage.explicitProvider).toBe("none");
      expect(r.storage.azureCredentialsPresent).toBe(false);
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("mirror empty ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES does not repopulate hosts from live env", () => {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "liveacct";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "livekey";
      process.env.ENDATIX_RESOLVED_STORAGE_VERSION = "1";
      process.env.ENDATIX_RESOLVED_STORAGE_EXPLICIT = "auto";
      process.env.ENDATIX_RESOLVED_AZURE_CREDENTIALS = "0";
      process.env.ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES = "";
      resetResolveEndatixSettingsCacheForTests();
      const r = resolveEndatixSettings({ source: "runtime" });
      expect(r.storage.imageRemoteHostnames).toEqual([]);
    });

    it("falls back to env when mirror version missing", () => {
      process.env.AZURE_STORAGE_ACCOUNT_NAME = "z";
      process.env.AZURE_STORAGE_ACCOUNT_KEY = "k";
      resetResolveEndatixSettingsCacheForTests();
      const r = resolveEndatixSettings({ source: "runtime" });
      expect(r.storage.azureCredentialsPresent).toBe(true);
      expect(r.storage.imageRemoteHostnames).toContain(
        "z.blob.core.windows.net",
      );
    });
  });
});

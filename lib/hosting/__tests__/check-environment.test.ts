import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigCacheForTests } from "@/features/config/api-config";
import { resetResolveEndatixSettingsCacheForTests } from "@/features/config/resolve-endatix-settings";
import { checkEnvironment, validateEnv } from "../check-environment";

describe("check-environment", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetApiConfigCacheForTests();
    resetResolveEndatixSettingsCacheForTests();
    process.env = { ...originalEnv };
    delete process.env.ENDATIX_BASE_URL;
    delete process.env.ENDATIX_API_URL;
    delete process.env.ENDATIX_API_PREFIX;
    delete process.env.ENDATIX_ENABLE_EXTENSIONS;
    delete process.env.__ENDATIX_LOGGED;
    process.env.SESSION_SECRET = "test-session-secret";
    process.env.STORAGE_PROVIDER = "none";
  });

  afterEach(() => {
    resetApiConfigCacheForTests();
    resetResolveEndatixSettingsCacheForTests();
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
  });

  describe("validateEnv", () => {
    it("fails when neither ENDATIX_BASE_URL nor ENDATIX_API_URL is set", () => {
      const { valid, errors } = validateEnv();
      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes("ENDATIX_API_URL"))).toBe(true);
    });

    it("passes with ENDATIX_API_URL alone", () => {
      process.env.ENDATIX_API_URL = "https://helm.example.com/api";
      expect(validateEnv().valid).toBe(true);
    });

    it("passes with ENDATIX_BASE_URL alone and hydrates ENDATIX_API_URL", () => {
      process.env.ENDATIX_BASE_URL = "https://api.example.com";
      expect(validateEnv().valid).toBe(true);
      expect(process.env.ENDATIX_API_URL).toBe("https://api.example.com/api");
    });

    it("fails when SESSION_SECRET is missing", () => {
      process.env.ENDATIX_API_URL = "https://helm.example.com/api";
      delete process.env.SESSION_SECRET;
      const { valid, errors } = validateEnv();
      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes("SESSION_SECRET"))).toBe(true);
    });
  });

  describe("checkEnvironment", () => {
    it("logs enabled experimental extensions at startup", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.ENDATIX_API_URL = "https://helm.example.com/api";
      process.env.ENDATIX_ENABLE_EXTENSIONS = "true";
      delete process.env.__ENDATIX_LOGGED;

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      checkEnvironment();

      expect(logSpy).toHaveBeenCalledWith(
        "🚧 Endatix experimental features (use with caution):",
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("extensions"),
      );
      logSpy.mockRestore();
    });
  });
});

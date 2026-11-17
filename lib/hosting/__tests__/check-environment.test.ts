import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigCacheForTests } from "@/features/config/api-config";
import { resetResolveEndatixSettingsCacheForTests } from "@/features/config/resolve-endatix-settings";
import { checkEnvironment, validateEnv } from "../check-environment";

const STRONG_AUTH_SECRET = "nW2v7yQ0bJ+Hk3s9xUe1LmZpRt8cAa4dFg6oIhKqVwE=";
const EXAMPLE_AUTH_SECRET = "QKYuOMS2deIInJt9q6WNmWwuh9QtL7BPKKQfTG/KI48=";

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
    process.env.AUTH_SECRET = STRONG_AUTH_SECRET;
    process.env.STORAGE_PROVIDER = "none";
  });

  afterEach(() => {
    resetApiConfigCacheForTests();
    resetResolveEndatixSettingsCacheForTests();
    process.env = { ...originalEnv };
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

    it("no longer requires SESSION_SECRET", () => {
      process.env.ENDATIX_API_URL = "https://helm.example.com/api";
      delete process.env.SESSION_SECRET;
      expect(validateEnv().valid).toBe(true);
    });

    it("reports a missing AUTH_SECRET as fatal", () => {
      process.env.ENDATIX_API_URL = "https://helm.example.com/api";
      delete process.env.AUTH_SECRET;
      const { valid, fatalErrors } = validateEnv();
      expect(valid).toBe(false);
      expect(fatalErrors).toHaveLength(1);
      expect(fatalErrors[0]).toContain("AUTH_SECRET");
    });

    it("keeps other errors non-fatal", () => {
      const { valid, errors, fatalErrors } = validateEnv();
      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes("ENDATIX_API_URL"))).toBe(true);
      expect(fatalErrors).toEqual([]);
    });
  });

  describe("checkEnvironment", () => {
    const exitSpy = () =>
      vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
    });

    it.each([
      ["missing", undefined],
      ["short", "too-short-secret"],
      ["an example value", EXAMPLE_AUTH_SECRET],
    ])(
      "stops startup in production when AUTH_SECRET is %s",
      (_label, value) => {
        vi.stubEnv("NODE_ENV", "production");
        process.env.ENDATIX_API_URL = "https://helm.example.com/api";
        if (value === undefined) delete process.env.AUTH_SECRET;
        else process.env.AUTH_SECRET = value;
        const exit = exitSpy();
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(console, "log").mockImplementation(() => {});

        checkEnvironment();

        expect(exit).toHaveBeenCalledWith(1);
        const logged = errorSpy.mock.calls.flat().join("\n");
        expect(logged).toContain("AUTH_SECRET");
        if (value) expect(logged).not.toContain(value);
      },
    );

    it("starts in production with a strong AUTH_SECRET", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.ENDATIX_API_URL = "https://helm.example.com/api";
      const exit = exitSpy();
      vi.spyOn(console, "log").mockImplementation(() => {});

      checkEnvironment();

      expect(exit).not.toHaveBeenCalled();
    });

    it("keeps starting in production on a non-fatal error", () => {
      vi.stubEnv("NODE_ENV", "production");
      const exit = exitSpy();
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});

      checkEnvironment();

      expect(exit).not.toHaveBeenCalled();
    });

    it("logs enabled experimental extensions at startup", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.ENDATIX_API_URL = "https://helm.example.com/api";
      process.env.ENDATIX_ENABLE_EXTENSIONS = "true";
      delete process.env.__ENDATIX_LOGGED;

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      checkEnvironment();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Endatix experiments (use with caution):"),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("extensions"),
      );
      logSpy.mockRestore();
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getExperimentalConfig,
  logExperimentalStatus,
} from "../experimental-config";

describe("experimental-config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.ENDATIX_ENABLE_EXTENSIONS;
    delete process.env.__ENDATIX_LOGGED;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
  });

  describe("getExperimentalConfig", () => {
    it("returns extensions false when ENDATIX_ENABLE_EXTENSIONS is unset", () => {
      delete process.env.ENDATIX_ENABLE_EXTENSIONS;
      expect(getExperimentalConfig()).toEqual({ extensions: false });
    });

    it("returns extensions true when ENDATIX_ENABLE_EXTENSIONS is 'true'", () => {
      process.env.ENDATIX_ENABLE_EXTENSIONS = "true";
      expect(getExperimentalConfig()).toEqual({ extensions: true });
    });

    it("returns extensions true when ENDATIX_ENABLE_EXTENSIONS is 'true' with whitespace", () => {
      process.env.ENDATIX_ENABLE_EXTENSIONS = " true ";
      expect(getExperimentalConfig()).toEqual({ extensions: true });
    });

    it("returns extensions false when ENDATIX_ENABLE_EXTENSIONS is 'false'", () => {
      process.env.ENDATIX_ENABLE_EXTENSIONS = "false";
      expect(getExperimentalConfig()).toEqual({ extensions: false });
    });

    it("returns extensions false for any other env value", () => {
      process.env.ENDATIX_ENABLE_EXTENSIONS = "1";
      expect(getExperimentalConfig().extensions).toBe(false);
      process.env.ENDATIX_ENABLE_EXTENSIONS = "yes";
      expect(getExperimentalConfig().extensions).toBe(false);
    });
  });

  describe("logExperimentalStatus", () => {
    it("does not throw when called with config", () => {
      expect(() => logExperimentalStatus({ extensions: false })).not.toThrow();
    });

    it("does not call console.log in test env", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      logExperimentalStatus({ extensions: true });
      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it("calls console.log when not in test and config has enabled feature", () => {
      vi.stubEnv("NODE_ENV", "development");
      delete process.env.__ENDATIX_LOGGED;
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      logExperimentalStatus({ extensions: true });

      expect(logSpy).toHaveBeenCalledWith(
        "🚧 Endatix experimental features (use with caution):",
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("extensions"),
      );
      logSpy.mockRestore();
    });

    it("does not log when no experimental feature is enabled", () => {
      vi.stubEnv("NODE_ENV", "development");
      delete process.env.__ENDATIX_LOGGED;
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      logExperimentalStatus({ extensions: false });

      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});

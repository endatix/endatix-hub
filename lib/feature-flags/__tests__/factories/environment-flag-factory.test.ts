import { describe, it, expect, vi, beforeEach } from "vitest";
import { EnvironmentFlagFactory } from "@/lib/feature-flags/factories/environment-flag-factory";

describe("EnvironmentFlagFactory", () => {
  let factory: EnvironmentFlagFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    factory = new EnvironmentFlagFactory();

    // Clear environment variables
    delete process.env.FLAG_TEST_BOOLEAN;
    delete process.env.FLAG_TEST_STRING;
    delete process.env.FLAG_TEST_OBJECT;
    delete process.env.FLAG_COMPLEX_FLAG;
  });

  describe("createFlag", () => {
    it("should create a flag function that reads environment variables", async () => {
      process.env.FLAG_TEST_FLAG = "env-value";

      const definition = {
        key: "test-flag",
        defaultValue: "default-value",
      };

      const flagFunction = factory.createFlag(definition);
      const result = await flagFunction();

      expect(result).toBe("env-value");
    });

    it("should return default value when environment variable is not set", async () => {
      const definition = {
        key: "missing-flag",
        defaultValue: "default-value",
      };

      const flagFunction = factory.createFlag(definition);
      const result = await flagFunction();

      expect(result).toBe("default-value");
    });

    it("should handle boolean flags", async () => {
      process.env.FLAG_BOOLEAN_FLAG = "true";

      const definition = {
        key: "boolean-flag",
        defaultValue: false,
      };

      const flagFunction = factory.createFlag(definition);
      const result = await flagFunction();

      expect(result).toBe(true);
    });

    it("should handle false boolean flags", async () => {
      process.env.FLAG_BOOLEAN_FLAG = "false";

      const definition = {
        key: "boolean-flag",
        defaultValue: true,
      };

      const flagFunction = factory.createFlag(definition);
      const result = await flagFunction();

      expect(result).toBe(false);
    });

    it("should handle object flags with valid JSON", async () => {
      const testObject = { enabled: true, name: "test" };
      process.env.FLAG_OBJECT_FLAG = JSON.stringify(testObject);

      const definition = {
        key: "object-flag",
        defaultValue: { enabled: false, name: "default" },
      };

      const flagFunction = factory.createFlag(definition);
      const result = await flagFunction();

      expect(result).toEqual(testObject);
    });

    it("should handle object flags with invalid JSON", async () => {
      process.env.FLAG_OBJECT_FLAG = "invalid-json";

      const definition = {
        key: "object-flag",
        defaultValue: { enabled: false, name: "default" },
      };

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const flagFunction = factory.createFlag(definition);
      const result = await flagFunction();

      expect(result).toEqual({ enabled: false, name: "default" });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to parse JSON for object-flag, using default",
      );

      consoleSpy.mockRestore();
    });

    it("should handle string flags", async () => {
      process.env.FLAG_STRING_FLAG = "environment-string";

      const definition = {
        key: "string-flag",
        defaultValue: "default-string",
      };

      const flagFunction = factory.createFlag(definition);
      const result = await flagFunction();

      expect(result).toBe("environment-string");
    });

    it("should handle flags with parsePayload (parsePayload is ignored for env flags)", async () => {
      process.env.FLAG_COMPLEX_FLAG = JSON.stringify({ enabled: true });

      const parsePayload = vi.fn((payload) => payload as { enabled: boolean });
      const definition = {
        key: "complex-flag",
        defaultValue: { enabled: false },
        parsePayload,
      };

      const flagFunction = factory.createFlag(definition);
      const result = await flagFunction();

      // parsePayload should be ignored - environment factory uses direct JSON parsing
      expect(result).toEqual({ enabled: true });
      expect(parsePayload).not.toHaveBeenCalled();
    });

    it("should return a function", () => {
      const definition = {
        key: "test-flag",
        defaultValue: "value",
      };

      const flagFunction = factory.createFlag(definition);

      expect(typeof flagFunction).toBe("function");
    });

    it("should convert flag keys to uppercase environment variables", async () => {
      process.env.FLAG_KEBAB_CASE_FLAG = "converted";

      const definition = {
        key: "kebab-case-flag",
        defaultValue: "default",
      };

      const flagFunction = factory.createFlag(definition);
      const result = await flagFunction();

      expect(result).toBe("converted");
    });
  });
});

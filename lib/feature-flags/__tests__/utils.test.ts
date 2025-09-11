import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth module to prevent Next.js server module import issues
vi.mock("@/features/auth", () => ({
  getSession: vi.fn().mockResolvedValue({
    username: "test-user",
    accessToken: "test-token",
    refreshToken: "test-refresh-token",
    isLoggedIn: true,
  }),
}));

// Create mock factory with createFlag method
const mockCreateFlag = vi.fn();
const mockFactory = {
  createFlag: mockCreateFlag,
};

// Mock the factory provider
vi.mock("@/lib/feature-flags/factories/flag-factory-provider", () => ({
  flagFactoryProvider: {
    getFactory: () => mockFactory,
  },
}));

import { flag } from "@/lib/feature-flags/utils";

describe("flag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateFlag.mockReset();
  });

  describe("factory delegation", () => {
    it("should call createFlag on the factory with the flag definition", () => {
      const definition = {
        key: "test-flag",
        defaultValue: "default-value",
      };
      const mockFlagFunction = vi.fn();
      mockCreateFlag.mockReturnValue(mockFlagFunction);

      const result = flag(definition);

      expect(mockCreateFlag).toHaveBeenCalledWith(definition);
      expect(result).toBe(mockFlagFunction);
    });

    it("should return the function returned by factory.createFlag", () => {
      const definition = {
        key: "test-flag",
        defaultValue: true,
      };
      const mockFlagFunction = vi.fn().mockResolvedValue(true);
      mockCreateFlag.mockReturnValue(mockFlagFunction);

      const result = flag(definition);

      expect(typeof result).toBe("function");
      expect(result).toBe(mockFlagFunction);
    });
  });

  describe("flag types", () => {
    it("should handle boolean flags", () => {
      const definition = {
        key: "boolean-flag",
        defaultValue: false,
      };
      const mockFlagFunction = vi.fn().mockResolvedValue(true);
      mockCreateFlag.mockReturnValue(mockFlagFunction);

      const result = flag(definition);

      expect(mockCreateFlag).toHaveBeenCalledWith(definition);
      expect(result).toBe(mockFlagFunction);
    });

    it("should handle string flags", () => {
      const definition = {
        key: "string-flag",
        defaultValue: "default-string",
      };
      const mockFlagFunction = vi.fn().mockResolvedValue("test-string");
      mockCreateFlag.mockReturnValue(mockFlagFunction);

      const result = flag(definition);

      expect(mockCreateFlag).toHaveBeenCalledWith(definition);
      expect(result).toBe(mockFlagFunction);
    });

    it("should handle number flags", () => {
      const definition = {
        key: "number-flag",
        defaultValue: 42,
      };
      const mockFlagFunction = vi.fn().mockResolvedValue(100);
      mockCreateFlag.mockReturnValue(mockFlagFunction);

      const result = flag(definition);

      expect(mockCreateFlag).toHaveBeenCalledWith(definition);
      expect(result).toBe(mockFlagFunction);
    });

    it("should handle object flags", () => {
      const definition = {
        key: "object-flag",
        defaultValue: { enabled: false, name: "default" },
      };
      const mockFlagFunction = vi
        .fn()
        .mockResolvedValue({ enabled: true, name: "test" });
      mockCreateFlag.mockReturnValue(mockFlagFunction);

      const result = flag(definition);

      expect(mockCreateFlag).toHaveBeenCalledWith(definition);
      expect(result).toBe(mockFlagFunction);
    });

    it("should handle object flags with parsePayload", () => {
      const parsePayload = (payload: unknown) =>
        payload as { enabled: boolean };
      const definition = {
        key: "complex-flag",
        defaultValue: { enabled: false },
        parsePayload,
      };
      const mockFlagFunction = vi.fn().mockResolvedValue({ enabled: true });
      mockCreateFlag.mockReturnValue(mockFlagFunction);

      const result = flag(definition);

      expect(mockCreateFlag).toHaveBeenCalledWith(definition);
      expect(result).toBe(mockFlagFunction);
    });
  });

  describe("overload compatibility", () => {
    it("should work with the boolean overload", () => {
      const definition = {
        key: "boolean-overload",
        defaultValue: false,
      };
      const mockFlagFunction = vi.fn().mockResolvedValue(true);
      mockCreateFlag.mockReturnValue(mockFlagFunction);

      const result = flag(definition);

      expect(mockCreateFlag).toHaveBeenCalledWith(definition);
      expect(result).toBe(mockFlagFunction);
    });

    it("should work with the string/number overload", () => {
      const definition = {
        key: "string-overload",
        defaultValue: "test" as const,
      };
      const mockFlagFunction = vi.fn().mockResolvedValue("result");
      mockCreateFlag.mockReturnValue(mockFlagFunction);

      const result = flag(definition);

      expect(mockCreateFlag).toHaveBeenCalledWith(definition);
      expect(result).toBe(mockFlagFunction);
    });

    it("should work with the complex object overload", () => {
      interface TestConfig {
        enabled: boolean;
        name: string;
      }

      const definition = {
        key: "complex-overload",
        defaultValue: { enabled: false, name: "default" } as TestConfig,
        parsePayload: (payload: unknown) => payload as TestConfig,
      };
      const mockFlagFunction = vi
        .fn()
        .mockResolvedValue({ enabled: true, name: "test" });
      mockCreateFlag.mockReturnValue(mockFlagFunction);

      const result = flag(definition);

      expect(mockCreateFlag).toHaveBeenCalledWith(definition);
      expect(result).toBe(mockFlagFunction);
    });
  });
});

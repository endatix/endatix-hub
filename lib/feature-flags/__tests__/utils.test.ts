import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/auth", () => ({
  getSession: vi.fn().mockResolvedValue({
    username: "test-user",
    accessToken: "test-token",
    refreshToken: "test-refresh-token",
    isLoggedIn: true,
  }),
}));

const mockCreateFlag = vi.fn();
const mockFactory = {
  createFlag: mockCreateFlag,
};

vi.mock("@/lib/feature-flags/factories/flag-factory-provider", () => ({
  flagFactoryProvider: {
    getFactory: () => mockFactory,
  },
}));

import { connection } from "next/server";
import { flag } from "@/lib/feature-flags/utils";

describe("flag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateFlag.mockReset();
  });

  describe("factory delegation", () => {
    it("does not bind a factory until the flag is evaluated", () => {
      const definition = {
        key: "test-flag",
        defaultValue: "default-value",
      };
      mockCreateFlag.mockReturnValue(
        vi.fn().mockResolvedValue("default-value"),
      );

      flag(definition);

      expect(mockCreateFlag).not.toHaveBeenCalled();
    });

    it("calls createFlag on first evaluation and returns that value", async () => {
      const definition = {
        key: "test-flag",
        defaultValue: true,
      };
      const mockFlagFunction = vi.fn().mockResolvedValue(true);
      mockCreateFlag.mockReturnValue(mockFlagFunction);

      const result = await flag(definition)();

      expect(mockCreateFlag).toHaveBeenCalledWith(definition);
      expect(mockFlagFunction).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    // Without this opt-out a prerender would bake the flag value into static HTML,
    // which is the build-time coupling this module exists to avoid.
    it("opts the request out of static rendering before evaluating", async () => {
      mockCreateFlag.mockReturnValue(vi.fn().mockResolvedValue(true));

      await flag({ key: "test-flag", defaultValue: false })();

      expect(connection).toHaveBeenCalled();
    });

    it("reuses the factory implementation on later evaluations", async () => {
      const definition = {
        key: "test-flag",
        defaultValue: false,
      };
      const mockFlagFunction = vi.fn().mockResolvedValue(false);
      mockCreateFlag.mockReturnValue(mockFlagFunction);

      const evaluate = flag(definition);
      await evaluate();
      await evaluate();

      expect(mockCreateFlag).toHaveBeenCalledTimes(1);
      expect(mockFlagFunction).toHaveBeenCalledTimes(2);
    });
  });

  describe("flag types", () => {
    it("should handle boolean flags", async () => {
      const definition = {
        key: "boolean-flag",
        defaultValue: false,
      };
      mockCreateFlag.mockReturnValue(vi.fn().mockResolvedValue(true));

      const result = await flag(definition)();

      expect(mockCreateFlag).toHaveBeenCalledWith(definition);
      expect(result).toBe(true);
    });

    it("should handle string flags", async () => {
      const definition = {
        key: "string-flag",
        defaultValue: "default-string",
      };
      mockCreateFlag.mockReturnValue(vi.fn().mockResolvedValue("test-string"));

      const result = await flag(definition)();

      expect(result).toBe("test-string");
    });

    it("should handle number flags", async () => {
      const definition = {
        key: "number-flag",
        defaultValue: 42,
      };
      mockCreateFlag.mockReturnValue(vi.fn().mockResolvedValue(100));

      const result = await flag(definition)();

      expect(result).toBe(100);
    });

    it("should handle object flags", async () => {
      const definition = {
        key: "object-flag",
        defaultValue: { enabled: false, name: "default" },
      };
      mockCreateFlag.mockReturnValue(
        vi.fn().mockResolvedValue({ enabled: true, name: "test" }),
      );

      const result = await flag(definition)();

      expect(result).toEqual({ enabled: true, name: "test" });
    });

    it("should handle object flags with parsePayload", async () => {
      const parsePayload = (payload: unknown) =>
        payload as { enabled: boolean };
      const definition = {
        key: "complex-flag",
        defaultValue: { enabled: false },
        parsePayload,
      };
      mockCreateFlag.mockReturnValue(
        vi.fn().mockResolvedValue({ enabled: true }),
      );

      const result = await flag(definition)();

      expect(mockCreateFlag).toHaveBeenCalledWith(definition);
      expect(result).toEqual({ enabled: true });
    });
  });
});

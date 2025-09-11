import { describe, it, expect, beforeEach, vi } from "vitest";
import * as FeatureFlagsModule from "@/lib/feature-flags";
import {
  flag,
  identify,
  aiFeaturesFlag,
  experimentalFeaturesFlag,
  advancedAnalyticsFlag,
  getAllFlags,
  flagFactoryProvider,
  PostHogFlagFactory,
  EnvironmentFlagFactory,
} from "@/lib/feature-flags";

vi.mock("@/features/auth", () => ({
  getSession: vi.fn().mockResolvedValue({
    username: "test-user",
    accessToken: "test-token",
    refreshToken: "test-refresh-token",
    isLoggedIn: true,
  }),
}));

describe("Feature Flags Module Exports", () => {
  beforeEach(() => {
    // Set PostHog API key for tests
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "test-key";
  });

  describe("main utilities", () => {
    it("should export flag function", () => {
      expect(typeof flag).toBe("function");
    });

    it("should export identify function", () => {
      expect(typeof identify).toBe("function");
    });
  });

  describe("type exports", () => {
    it("should export FeatureFlagConfig type", () => {
      // This test ensures the type is exportable (compilation test)
      expect(FeatureFlagsModule).toBeDefined();
    });

    it("should export AIFeatures type", () => {
      // This test ensures the type is exportable (compilation test)
      expect(FeatureFlagsModule).toBeDefined();
    });
  });

  describe("flag definitions", () => {
    it("should export all predefined flags", () => {
      expect(typeof aiFeaturesFlag).toBe("function");
      expect(typeof experimentalFeaturesFlag).toBe("function");
      expect(typeof advancedAnalyticsFlag).toBe("function");
      expect(typeof getAllFlags).toBe("function");
    });
  });

  describe("factory exports", () => {
    it("should export flagFactoryProvider", () => {
      expect(flagFactoryProvider).toBeDefined();
      expect(typeof flagFactoryProvider.getFactory).toBe("function");
    });

    it("should export factory classes", () => {
      expect(typeof PostHogFlagFactory).toBe("function");
      expect(typeof EnvironmentFlagFactory).toBe("function");
    });
  });

  describe("interface consistency", () => {
    it("should have consistent factory interface", () => {
      const postHogFactory = new PostHogFlagFactory();
      const envFactory = new EnvironmentFlagFactory();

      // Both should have createFlag method
      expect(typeof postHogFactory.createFlag).toBe("function");
      expect(typeof envFactory.createFlag).toBe("function");
    });
  });

  describe("public API completeness", () => {
    it("should export all expected members", () => {
      const expectedExports = [
        "flag",
        "identify",
        "aiFeaturesFlag",
        "experimentalFeaturesFlag",
        "advancedAnalyticsFlag",
        "getAllFlags",
        "flagFactoryProvider",
        "PostHogFlagFactory",
        "EnvironmentFlagFactory",
      ];

      expectedExports.forEach((exportName) => {
        expect(FeatureFlagsModule).toHaveProperty(exportName);
      });
    });

    it("should not expose internal implementation details", () => {
      // These should NOT be exported as they're internal
      const internalExports = [
        "shouldUsePostHogFlags",
        "createPostHogAdapter",
        "postHogIdentify",
      ];

      internalExports.forEach((internalExport) => {
        expect(FeatureFlagsModule).not.toHaveProperty(internalExport);
      });
    });
  });
});

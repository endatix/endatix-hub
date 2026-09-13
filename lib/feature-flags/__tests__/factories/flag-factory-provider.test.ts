import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FlagFactoryProvider } from "@/lib/feature-flags/factories/flag-factory-provider";

vi.mock("@/features/auth", () => ({
  getSession: vi.fn().mockResolvedValue({
    username: "test-user",
    accessToken: "test-token",
    refreshToken: "test-refresh-token",
    isLoggedIn: true,
  }),
}));

describe("FlagFactoryProvider", () => {
  const originalEnv = { ...process.env };
  let provider: FlagFactoryProvider;

  beforeEach(() => {
    provider = new FlagFactoryProvider();
    process.env = { ...originalEnv };
    delete process.env.FLAG_PROVIDER;
    delete process.env.POSTHOG_PROJECT_API_KEY;
    delete process.env.ENABLE_POSTHOG_ADAPTER;
    delete process.env.ENDATIX_POSTHOG_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getFactory", () => {
    it.each([
      ["posthog", "phc_test_key", "PostHogFlagFactory"],
      ["posthog", undefined, "EnvironmentFlagFactory"],
      ["posthog", "   ", "EnvironmentFlagFactory"],
      ["environment", "phc_test_key", "EnvironmentFlagFactory"],
      [undefined, "phc_test_key", "EnvironmentFlagFactory"],
    ])(
      "FLAG_PROVIDER=%s POSTHOG_PROJECT_API_KEY=%s selects %s",
      (providerName, key, expectedFactory) => {
        if (providerName !== undefined) {
          process.env.FLAG_PROVIDER = providerName;
        }
        if (key !== undefined) {
          process.env.POSTHOG_PROJECT_API_KEY = key;
        }

        expect(provider.getFactory().constructor.name).toBe(expectedFactory);
      },
    );

    it("ignores ENABLE_POSTHOG_ADAPTER and ENDATIX_POSTHOG_KEY", () => {
      process.env.ENABLE_POSTHOG_ADAPTER = "true";
      process.env.ENDATIX_POSTHOG_KEY = "phc_legacy_key";

      expect(provider.getFactory().constructor.name).toBe(
        "EnvironmentFlagFactory",
      );
    });

    it("reuses the same factory instance", () => {
      process.env.FLAG_PROVIDER = "posthog";
      process.env.POSTHOG_PROJECT_API_KEY = "phc_test_key";

      expect(provider.getFactory()).toBe(provider.getFactory());
    });

    it("freezes the factory after the first getFactory call", () => {
      expect(provider.getFactory().constructor.name).toBe(
        "EnvironmentFlagFactory",
      );

      process.env.FLAG_PROVIDER = "posthog";
      process.env.POSTHOG_PROJECT_API_KEY = "phc_test_key";

      expect(provider.getFactory().constructor.name).toBe(
        "EnvironmentFlagFactory",
      );
    });

    it("resetForTests() allows a later getFactory to re-read env", () => {
      expect(provider.getFactory().constructor.name).toBe(
        "EnvironmentFlagFactory",
      );

      process.env.FLAG_PROVIDER = "posthog";
      process.env.POSTHOG_PROJECT_API_KEY = "phc_test_key";
      provider.resetForTests();

      expect(provider.getFactory().constructor.name).toBe("PostHogFlagFactory");
    });
  });
});

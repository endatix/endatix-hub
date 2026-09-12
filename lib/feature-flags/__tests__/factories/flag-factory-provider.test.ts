import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FlagFactoryProvider } from "@/lib/feature-flags/factories/flag-factory-provider";

// Mock the auth module to prevent Next.js server module import issues
vi.mock("@/features/auth", () => ({
  getSession: vi.fn().mockResolvedValue({
    username: "test-user",
    accessToken: "test-token",
    refreshToken: "test-refresh-token",
    isLoggedIn: true,
  }),
}));

vi.mock("@flags-sdk/posthog", () => ({
  createPostHogAdapter: vi.fn(() => ({
    pflag: vi.fn(),
  })),
}));

describe("FlagFactoryProvider", () => {
  const originalEnv = { ...process.env };
  let provider: FlagFactoryProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new FlagFactoryProvider();
    process.env = { ...originalEnv };
    delete process.env.ENABLE_POSTHOG_ADAPTER;
    delete process.env.ENDATIX_POSTHOG_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getFactory", () => {
    // PostHog needs the operator switch *and* a usable project key; anything else is
    // environment flags. The whitespace case guards the trim in readPublicEndatixEnv().
    it.each([
      ["true", "phc_test_key", "PostHogFlagFactory"],
      ["true", undefined, "EnvironmentFlagFactory"],
      ["true", "   ", "EnvironmentFlagFactory"],
      ["false", "phc_test_key", "EnvironmentFlagFactory"],
      [undefined, "phc_test_key", "EnvironmentFlagFactory"],
    ])("adapter=%s key=%s selects %s", (adapter, key, expectedFactory) => {
      if (adapter !== undefined) {
        process.env.ENABLE_POSTHOG_ADAPTER = adapter;
      }
      if (key !== undefined) {
        process.env.ENDATIX_POSTHOG_KEY = key;
      }

      expect(provider.getFactory().constructor.name).toBe(expectedFactory);
    });

    it("reuses the same factory instance", () => {
      process.env.ENABLE_POSTHOG_ADAPTER = "true";
      process.env.ENDATIX_POSTHOG_KEY = "phc_test_key";

      expect(provider.getFactory()).toBe(provider.getFactory());
    });

    it("re-reads adapter env on each getFactory call", () => {
      expect(provider.getFactory().constructor.name).toBe(
        "EnvironmentFlagFactory",
      );

      process.env.ENABLE_POSTHOG_ADAPTER = "true";
      process.env.ENDATIX_POSTHOG_KEY = "phc_test_key";

      expect(provider.getFactory().constructor.name).toBe("PostHogFlagFactory");
    });
  });
});

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

/**
 * Drives the real environment rather than mocking `isPostHogEnabled`. The provider is
 * server-only code, and mocking the key check would hide exactly the failure this suite
 * exists to catch: a key read that resolves against the browser projection under jsdom
 * and silently disables PostHog flags.
 */
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
    describe("when the adapter is enabled and a project key is configured", () => {
      beforeEach(() => {
        process.env.ENABLE_POSTHOG_ADAPTER = "true";
        process.env.ENDATIX_POSTHOG_KEY = "phc_test_key";
      });

      it("should return PostHogFlagFactory when conditions are met", () => {
        const factory = provider.getFactory();

        expect(factory.constructor.name).toBe("PostHogFlagFactory");
      });

      it("should reuse the same PostHogFlagFactory instance", () => {
        const factory1 = provider.getFactory();
        const factory2 = provider.getFactory();

        expect(factory1).toBe(factory2);
        expect(factory1.constructor.name).toBe("PostHogFlagFactory");
      });
    });

    describe("when PostHog adapter is disabled via environment", () => {
      beforeEach(() => {
        process.env.ENABLE_POSTHOG_ADAPTER = "false";
        process.env.ENDATIX_POSTHOG_KEY = "phc_test_key";
      });

      it("should return EnvironmentFlagFactory", () => {
        const factory = provider.getFactory();

        expect(factory.constructor.name).toBe("EnvironmentFlagFactory");
      });
    });

    describe("when the project key is missing", () => {
      beforeEach(() => {
        process.env.ENABLE_POSTHOG_ADAPTER = "true";
        delete process.env.ENDATIX_POSTHOG_KEY;
      });

      it("should return EnvironmentFlagFactory", () => {
        const factory = provider.getFactory();

        expect(factory.constructor.name).toBe("EnvironmentFlagFactory");
      });
    });

    describe("when the project key is only whitespace", () => {
      beforeEach(() => {
        process.env.ENABLE_POSTHOG_ADAPTER = "true";
        process.env.ENDATIX_POSTHOG_KEY = "   ";
      });

      it("should return EnvironmentFlagFactory", () => {
        const factory = provider.getFactory();

        expect(factory.constructor.name).toBe("EnvironmentFlagFactory");
      });
    });

    describe("when both PostHog conditions are false", () => {
      beforeEach(() => {
        process.env.ENABLE_POSTHOG_ADAPTER = "false";
        delete process.env.ENDATIX_POSTHOG_KEY;
      });

      it("should return EnvironmentFlagFactory", () => {
        const factory = provider.getFactory();

        expect(factory.constructor.name).toBe("EnvironmentFlagFactory");
      });

      it("should reuse the same EnvironmentFlagFactory instance", () => {
        const factory1 = provider.getFactory();
        const factory2 = provider.getFactory();

        expect(factory1).toBe(factory2);
        expect(factory1.constructor.name).toBe("EnvironmentFlagFactory");
      });
    });

    describe("when environment variable is undefined", () => {
      beforeEach(() => {
        // Don't set ENABLE_POSTHOG_ADAPTER
        process.env.ENDATIX_POSTHOG_KEY = "phc_test_key";
      });

      it("should return EnvironmentFlagFactory (falsy check)", () => {
        const factory = provider.getFactory();

        expect(factory.constructor.name).toBe("EnvironmentFlagFactory");
      });
    });
  });
});

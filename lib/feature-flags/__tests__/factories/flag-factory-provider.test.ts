import { describe, it, expect, vi, beforeEach } from "vitest";
import { FlagFactoryProvider } from "@/lib/feature-flags/factories/flag-factory-provider";
import { isPostHogEnabled } from "@/features/analytics/posthog/shared/config";

process.env.NEXT_PUBLIC_POSTHOG_KEY = "test-key";

vi.mock("@flags-sdk/posthog", () => ({
  createPostHogAdapter: vi.fn(() => ({
    pflag: vi.fn(),
  })),
}));

vi.mock("@/features/analytics/posthog/shared/config", () => ({
  isPostHogEnabled: vi.fn(),
}));

describe("FlagFactoryProvider", () => {
  let provider: FlagFactoryProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new FlagFactoryProvider();

    delete process.env.ENABLE_POSTHOG_ADAPTER;
  });

  describe("getFactory", () => {
    describe("when PostHog is enabled", () => {
      beforeEach(() => {
        process.env.ENABLE_POSTHOG_ADAPTER = "true";
        vi.mocked(isPostHogEnabled).mockReturnValue(true);
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
        vi.mocked(isPostHogEnabled).mockReturnValue(true);
      });

      it("should return EnvironmentFlagFactory", () => {
        const factory = provider.getFactory();

        expect(factory.constructor.name).toBe("EnvironmentFlagFactory");
      });
    });

    describe("when PostHog is disabled", () => {
      beforeEach(() => {
        process.env.ENABLE_POSTHOG_ADAPTER = "true";
        vi.mocked(isPostHogEnabled).mockReturnValue(false);
      });

      it("should return EnvironmentFlagFactory", () => {
        const factory = provider.getFactory();

        expect(factory.constructor.name).toBe("EnvironmentFlagFactory");
      });
    });

    describe("when both PostHog conditions are false", () => {
      beforeEach(() => {
        process.env.ENABLE_POSTHOG_ADAPTER = "false";
        vi.mocked(isPostHogEnabled).mockReturnValue(false);
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
        vi.mocked(isPostHogEnabled).mockReturnValue(true);
      });

      it("should return EnvironmentFlagFactory (falsy check)", () => {
        const factory = provider.getFactory();

        expect(factory.constructor.name).toBe("EnvironmentFlagFactory");
      });
    });
  });
});

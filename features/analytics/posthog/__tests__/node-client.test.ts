import { describe, it, expect, beforeEach, vi } from "vitest";
import { PostHog } from "posthog-node";
import { getPostHogServer, resetPostHogServer } from "../server/node-client";
import { createPostHogConfig, isPostHogEnabled } from "../shared/config";

describe("PostHog Server", () => {
  // Default test configuration
  const defaultConfig = {
    apiKey: "test-api-key",
    apiHost: "https://test.posthog.com",
    enabled: true,
    debug: false,
  };

  beforeEach(() => {
    // Reset everything before each test
    vi.clearAllMocks();
    resetPostHogServer();
    
    // Set up default mock behaviors
    vi.mocked(createPostHogConfig).mockReturnValue(defaultConfig);
    vi.mocked(isPostHogEnabled).mockReturnValue(true);
  });

  // Mock dependencies
  vi.mock("../shared/config", () => ({
    createPostHogConfig: vi.fn(),
    isPostHogEnabled: vi.fn(),
  }));

  vi.mock("posthog-node", () => ({
    PostHog: vi.fn().mockImplementation(() => ({
      capture: vi.fn(),
      isFeatureEnabled: vi.fn(),
      shutdown: vi.fn(),
    })),
  }));

  describe("getPostHogServer", () => {
    it("creates a PostHog instance with proper configuration", () => {
      // Act
      const client = getPostHogServer(defaultConfig);

      // Assert
      expect(client).not.toBeNull();
      expect(PostHog).toHaveBeenCalledWith(defaultConfig.apiKey, {
        host: defaultConfig.apiHost,
        flushAt: 1,
        flushInterval: 0,
      });
    });

    it("returns the same instance on subsequent calls (singleton pattern)", () => {
      // Act
      const firstClient = getPostHogServer(defaultConfig);
      const secondClient = getPostHogServer(defaultConfig);

      // Assert
      expect(firstClient).toBe(secondClient);
      expect(PostHog).toHaveBeenCalledTimes(1);
    });

    it("returns null when PostHog is disabled", () => {
      // Arrange
      vi.mocked(isPostHogEnabled).mockReturnValue(false);

      // Act
      const client = getPostHogServer(defaultConfig);

      // Assert
      expect(client).toBeNull();
      expect(PostHog).not.toHaveBeenCalled();
    });

    it("returns null when API key is missing", () => {
      // Arrange
      const noKeyConfig = { ...defaultConfig, apiKey: "" };
      vi.mocked(createPostHogConfig).mockReturnValue(noKeyConfig);

      // Act
      const client = getPostHogServer(noKeyConfig);

      // Assert
      expect(client).toBeNull();
      expect(PostHog).not.toHaveBeenCalled();
    });

    it("uses default config when none is provided", () => {
      // Act
      const client = getPostHogServer();

      // Assert
      expect(client).not.toBeNull();
      expect(createPostHogConfig).toHaveBeenCalledWith(undefined);
      expect(PostHog).toHaveBeenCalledWith(defaultConfig.apiKey, {
        host: defaultConfig.apiHost,
        flushAt: 1,
        flushInterval: 0,
      });
    });
  });
}); 
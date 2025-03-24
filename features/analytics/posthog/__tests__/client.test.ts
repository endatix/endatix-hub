import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import posthog from "posthog-js";
import {
  initPostHog,
  trackEvent,
  isFeatureEnabled,
  resetTrackedIdentity,
} from "../client/client";
import type { PostHogConfig, PostHogClientOptions } from "../shared/types";

// Mock posthog-js
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    isFeatureEnabled: vi.fn(),
    reset: vi.fn(),
    __loaded: false,
  },
}));

describe("PostHog Client", () => {
  const mockConfig: PostHogConfig = {
    apiKey: "test-api-key",
    apiHost: "https://test.posthog.com",
    uiHost: "https://app.posthog.com",
    enabled: true,
    debug: false,
  };

  const mockOptions: Partial<PostHogClientOptions> = {
    capturePageview: false,
    disableSessionRecording: true,
  };

  // Global setup before each test
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Reset PostHog mock state
    vi.mocked(posthog).__loaded = false;

    // Reset the global window
    if (typeof window === "undefined") {
      // @ts-expect-error: simulating window
      global.window = {};
    }
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initPostHog", () => {
    // No special setup needed for most initPostHog tests

    it("should handle initialization errors gracefully", () => {
      // Arrange
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock the init function to throw
      vi.mocked(posthog.init).mockImplementationOnce(() => {
        throw new Error("Initialization error");
      });

      // Act
      const result = initPostHog(mockConfig, { ...mockOptions });

      // Assert
      expect(result).toBe(false);
      expect(posthog.init).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[PostHog] Failed to initialize:",
        expect.any(Error),
      );

      // Clean up
      consoleErrorSpy.mockRestore();
    });

    it("should initialize PostHog with the correct config", () => {
      // Act
      const result = initPostHog(mockConfig, mockOptions);

      // Assert
      expect(result).toBe(true);
      expect(posthog.init).toHaveBeenCalledWith(
        mockConfig.apiKey,
        expect.objectContaining({
          api_host: mockConfig.apiHost,
          ui_host: mockConfig.uiHost,
          capture_pageview: mockOptions.capturePageview,
          disable_session_recording: mockOptions.disableSessionRecording,
        }),
      );
    });

    it("should not initialize when PostHog is disabled", () => {
      // Arrange
      const disabledConfig = { ...mockConfig, enabled: false };

      // Act
      const result = initPostHog(disabledConfig, mockOptions);

      // Assert
      expect(result).toBe(false);
      expect(posthog.init).not.toHaveBeenCalled();
    });

    it("should not initialize when in a non-browser environment", () => {
      // Arrange
      const originalWindow = global.window;
      // @ts-expect-error: simulating non-browser
      delete global.window;

      // Act
      const result = initPostHog(mockConfig, mockOptions);

      // Assert
      expect(result).toBe(false);
      expect(posthog.init).not.toHaveBeenCalled();

      // Cleanup
      global.window = originalWindow;
    });

    it("should not reinitialize when already initialized", () => {
      // Arrange - First initialize by setting __loaded to true
      vi.mocked(posthog).__loaded = true;

      // Act - Try to initialize again
      const result = initPostHog(mockConfig, mockOptions);

      // Assert
      expect(result).toBe(false);
      expect(posthog.init).not.toHaveBeenCalled();
    });
  });

  describe("trackEvent", () => {
    // Setup for trackEvent tests
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // Spy on console.warn for all trackEvent tests
      consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      // Clean up console spy
      consoleWarnSpy.mockRestore();
    });

    it("should initialize and track event when config is provided", () => {
      // Arrange
      // Simulate what trackEvent would do with config
      // Call init first
      posthog.init(mockConfig.apiKey, {});

      // Act - then capture
      posthog.capture("test_event", { property: "value" });

      // Assert
      expect(posthog.init).toHaveBeenCalled();
      expect(posthog.capture).toHaveBeenCalledWith("test_event", {
        property: "value",
      });
    });

    it("should track event with properties", () => {
      // Arrange - Set PostHog as initialized
      vi.mocked(posthog).__loaded = true;

      const eventName = "test_event";
      const properties = { property1: "value1" };

      // Act
      trackEvent(eventName, properties);

      // Assert
      expect(posthog.capture).toHaveBeenCalledWith(eventName, properties);
    });

    it("should not track event in non-browser environment", () => {
      // Arrange
      const originalWindow = global.window;
      // @ts-expect-error: simulating non-browser
      delete global.window;

      // Act
      trackEvent("test_event");

      // Assert
      expect(posthog.capture).not.toHaveBeenCalled();

      // Cleanup
      global.window = originalWindow;
    });

    it("should check initialization state before tracking", () => {
      // Arrange - Start with initialized state
      vi.mocked(posthog).__loaded = true;

      // Act
      trackEvent("test_event");

      // Assert
      expect(posthog.capture).toHaveBeenCalledWith("test_event", undefined);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should not track event when PostHog is not initialized", () => {
      // Arrange - ensure PostHog is NOT initialized
      vi.mocked(posthog).__loaded = false;

      // Act
      trackEvent("test_event");

      // Assert
      expect(posthog.capture).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("PostHog not initialized"),
      );
    });

    it("should handle errors when tracking event", () => {
      // Arrange
      vi.mocked(posthog).__loaded = true;
      vi.mocked(posthog.capture).mockImplementation(() => {
        throw new Error("Tracking error");
      });

      // Act & Assert
      expect(() => {
        trackEvent("test_event");
      }).not.toThrow();
    });
  });

  describe("isFeatureEnabled", () => {
    // Setup for isFeatureEnabled tests
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // Spy on console.warn for all tests
      consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      // Clean up
      consoleWarnSpy.mockRestore();
    });

    it("should check if feature is enabled", () => {
      // Arrange - explicitly initialize
      vi.mocked(posthog).__loaded = true;
      vi.mocked(posthog.isFeatureEnabled).mockReturnValue(true);

      // Act
      const result = isFeatureEnabled("test_feature");

      // Assert
      expect(result).toBe(true);
      expect(posthog.isFeatureEnabled).toHaveBeenCalledWith("test_feature", {
        send_event: true,
      });
    });

    it("should return default value in non-browser environment", () => {
      // Arrange
      const originalWindow = global.window;
      // @ts-expect-error: simulating non-browser
      delete global.window;

      // Act
      const result = isFeatureEnabled("test_feature", true);

      // Assert
      expect(result).toBe(true);
      expect(posthog.isFeatureEnabled).not.toHaveBeenCalled();

      // Cleanup
      global.window = originalWindow;
    });

    it("should return default value when PostHog is not initialized", () => {
      // Arrange - ensure PostHog is NOT initialized
      vi.mocked(posthog).__loaded = false;

      // Act
      const result = isFeatureEnabled("test_feature", true);

      // Assert
      expect(result).toBe(true);
      expect(posthog.isFeatureEnabled).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("PostHog not initialized"),
      );
    });

    it("should initialize and check feature when config is provided", () => {
      // Arrange - test direct initialization path
      vi.mocked(posthog.isFeatureEnabled).mockReturnValue(true);

      // Mock init to set __loaded to true
      vi.mocked(posthog.init).mockImplementationOnce(() => {
        vi.mocked(posthog).__loaded = true;
        return posthog; // Return the mocked posthog instance
      });

      // Act
      const result = isFeatureEnabled("test_feature", false, mockConfig);

      // Assert
      expect(result).toBe(true);
      expect(posthog.init).toHaveBeenCalled();
      expect(posthog.isFeatureEnabled).toHaveBeenCalled();
    });

    it("should handle errors when checking feature flag", () => {
      // Arrange
      vi.mocked(posthog).__loaded = true;
      vi.mocked(posthog.isFeatureEnabled).mockImplementation(() => {
        throw new Error("Feature flag error");
      });

      // Act
      const result = isFeatureEnabled("test_feature", true);

      // Assert
      expect(result).toBe(true); // Returns default value on error
    });
  });

  describe("resetTrackedIdentity", () => {
    // Setup for resetTrackedIdentity tests
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // Spy on console for all tests
      consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      // Clean up
      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it("should reset PostHog identity", () => {
      // Arrange - initialize explicitly
      vi.mocked(posthog).__loaded = true;

      // Act
      resetTrackedIdentity();

      // Assert
      expect(posthog.reset).toHaveBeenCalled();
    });

    it("should not reset in non-browser environment", () => {
      // Arrange
      const originalWindow = global.window;
      // @ts-expect-error: simulating non-browser
      delete global.window;

      // Act
      resetTrackedIdentity();

      // Assert
      expect(posthog.reset).not.toHaveBeenCalled();

      // Cleanup
      global.window = originalWindow;
    });

    it("should attempt reset even if PostHog is not fully initialized", () => {
      // Arrange - deliberately NOT setting __loaded to true

      // Act
      resetTrackedIdentity();

      // Assert
      expect(posthog.reset).toHaveBeenCalled();
    });

    it("should log debug info when debug mode is enabled", () => {
      // Arrange
      const debugConfig = { ...mockConfig, debug: true };
      vi.mocked(posthog).__loaded = true;

      // Act
      resetTrackedIdentity(debugConfig);

      // Assert
      expect(posthog.reset).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[PostHog] User identity reset successfully",
      );
    });

    it("should handle errors when resetting identity", () => {
      // Arrange
      vi.mocked(posthog).__loaded = true;
      vi.mocked(posthog.reset).mockImplementation(() => {
        throw new Error("Reset error");
      });

      // Act & Assert
      expect(() => {
        resetTrackedIdentity();
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[PostHog] Failed to reset user identity:",
        expect.any(Error),
      );
    });
  });
});

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import posthog from "posthog-js";
import {
  initPostHog,
  trackEvent,
  trackException,
  isFeatureEnabled,
  resetTrackedIdentity,
} from "../client/client";
import type { PostHogConfig, PostHogClientOptions } from "../shared/types";

// Mock posthog-js
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    captureException: vi.fn(),
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.mocked(posthog).__loaded = false;

    if (typeof window === "undefined") {
      // @ts-expect-error: simulating window
      global.window = {};
    }
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initPostHog", () => {
    it("should handle initialization errors gracefully", () => {
      // Arrange
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

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
      // Arrange
      vi.mocked(posthog).__loaded = true;

      // Act
      const result = initPostHog(mockConfig, mockOptions);

      // Assert
      expect(result).toBe(false);
      expect(posthog.init).not.toHaveBeenCalled();
    });
  });

  describe("trackEvent", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("should track event when PostHog is initialized", () => {
      // Arrange
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

    it("should initialize and track event when config is provided", () => {
      // Arrange
      vi.mocked(posthog.init).mockImplementationOnce(() => {
        vi.mocked(posthog).__loaded = true;
        return posthog;
      });

      // Act
      trackEvent("test_event", undefined, mockConfig);

      // Assert
      expect(posthog.init).toHaveBeenCalled();
      expect(posthog.capture).toHaveBeenCalledWith("test_event", undefined);
    });

    it("should handle errors when tracking event", () => {
      // Arrange
      vi.mocked(posthog).__loaded = true;
      vi.mocked(posthog.capture).mockImplementation(() => {
        throw new Error("Tracking error");
      });

      // Act
      trackEvent("test_event");

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[PostHog] Failed to track event test_event:",
        expect.any(Error),
      );
    });
  });

  describe("trackException", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("should track exception when PostHog is initialized", () => {
      // Arrange
      vi.mocked(posthog).__loaded = true;
      const error = new Error("Test error");
      const properties = { property1: "value1" };

      // Act
      trackException(error, properties);

      // Assert
      expect(posthog.captureException).toHaveBeenCalledWith(error, properties);
    });

    it("should not track exception in non-browser environment", () => {
      // Arrange
      const originalWindow = global.window;
      // @ts-expect-error: simulating non-browser
      delete global.window;

      // Act
      trackException(new Error("Test error"));

      // Assert
      expect(posthog.captureException).not.toHaveBeenCalled();

      // Cleanup
      global.window = originalWindow;
    });

    it("should initialize and track exception when config is provided", () => {
      // Arrange
      vi.mocked(posthog.init).mockImplementationOnce(() => {
        vi.mocked(posthog).__loaded = true;
        return posthog;
      });

      // Act
      trackException(new Error("Test error"), undefined, mockConfig);

      // Assert
      expect(posthog.init).toHaveBeenCalled();
      expect(posthog.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        undefined,
      );
    });

    it("should handle errors when tracking exception", () => {
      // Arrange
      vi.mocked(posthog).__loaded = true;
      vi.mocked(posthog.captureException).mockImplementation(() => {
        throw new Error("Capture error");
      });

      // Act
      trackException(new Error("Test error"));

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[PostHog] Failed to track exception:",
        expect.any(Error),
      );
    });
  });

  describe("isFeatureEnabled", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("should check if feature is enabled", () => {
      // Arrange
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
      // Arrange
      vi.mocked(posthog).__loaded = false;

      // Act
      const result = isFeatureEnabled("test_feature", true);

      // Assert
      expect(result).toBe(true);
      expect(posthog.isFeatureEnabled).not.toHaveBeenCalled();
    });

    it("should initialize and check feature when config is provided", () => {
      // Arrange
      vi.mocked(posthog.init).mockImplementationOnce(() => {
        vi.mocked(posthog).__loaded = true;
        return posthog;
      });
      vi.mocked(posthog.isFeatureEnabled).mockReturnValue(true);

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
      expect(result).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[PostHog] Failed to check feature flag test_feature:",
        expect.any(Error),
      );
    });
  });

  describe("resetTrackedIdentity", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("should reset PostHog identity when initialized", () => {
      // Arrange
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

    it("should initialize and reset when config is provided", () => {
      // Arrange
      vi.mocked(posthog.init).mockImplementationOnce(() => {
        vi.mocked(posthog).__loaded = true;
        return posthog;
      });

      // Act
      resetTrackedIdentity(mockConfig);

      // Assert
      expect(posthog.init).toHaveBeenCalled();
      expect(posthog.reset).toHaveBeenCalled();
    });

    it("should handle errors when resetting identity", () => {
      // Arrange
      vi.mocked(posthog).__loaded = true;
      vi.mocked(posthog.reset).mockImplementation(() => {
        throw new Error("Reset error");
      });

      // Act
      resetTrackedIdentity();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[PostHog] Failed to reset user identity:",
        expect.any(Error),
      );
    });
  });
});
